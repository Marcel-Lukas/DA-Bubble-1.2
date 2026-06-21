import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { Message } from '../../../../shared/interfaces/message.interface';
import { Timestamp } from '@angular/fire/firestore';
import { UserService } from '../../../../shared/services/user.service';
import { ChannelService } from '../../../../shared/services/channel.service';
import { User } from '../../../../shared/interfaces/user.interface';
import { Channel } from '../../../../shared/interfaces/channel.interface';
import {
  GroupedReaction,
  Reaction,
} from '../../../../shared/interfaces/reaction.interface';
import { Subscription } from 'rxjs';
import { MessageService } from '../../../../shared/services/message.service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { PermanentDeleteComponent } from '../../../general-components/permanent-delete/permanent-delete.component';
import { FormsModule } from '@angular/forms';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';
import {
  FormatTag,
  hasVisibleContent,
  stripEmptyFormatTags,
  toggleFormatTag,
} from '../../../../shared/utils/text-format.util';

// NOTE: `<emoji-mart>` is only referenced inside a `@defer` block in the
// template. Angular therefore emits `@ctrl/ngx-emoji-mart` (and its CSS) as
// its own lazy chunk that is only fetched the first time the user opens the
// emoji picker.

/**
 * A slice of a message text used for rendering: either plain text or a mention
 * of a user (`@`) or a channel (`#`).
 */
export interface MessageSegment {
  type: 'text' | 'user' | 'channel' | 'link';
  /** Text to display (e.g. `@Max`, `#general`, a URL or plain text). */
  label: string;
  /** Id of the referenced user/channel, if resolvable. */
  refId?: string;
  /** Absolute URL to open for `link` segments. */
  href?: string;
  /** Whether the segment is bold (`<b>`). */
  bold?: boolean;
  /** Whether the segment is italic (`<i>`). */
  italic?: boolean;
  /** Whether the segment is underlined (`<u>`). */
  underline?: boolean;
}

/** The inline formatting state active while parsing a message. */
interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

@Component({
  selector: 'app-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PickerComponent, PermanentDeleteComponent, FormsModule, ImageFallbackDirective],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
/**
 * Renders a single chat message: sender info, parsed text with @/# mentions,
 * grouped reactions, inline editing, deletion and thread preview. Uses OnPush
 * change detection with explicit markForCheck() after async updates.
 */
export class MessageComponent implements OnInit {
  private userService = inject(UserService);
  private channelService = inject(ChannelService);
  private messageService = inject(MessageService);
  // With OnPush change detection, asynchronously assigned fields (sender,
  // active user, thread info) don't trigger a re-render automatically. We
  // call `cdr.markForCheck()` after each async update.
  private cdr = inject(ChangeDetectorRef);
  private userSub?: Subscription;
  private threadSub?: Subscription;
  private senderSub?: Subscription;

  @Input() chatType: 'private' | 'channel' | 'thread' | 'new' | null = null;
  @Input() message!: Message;
  @Input() activeUserId: string | null = null;

  @Output() profileClick = new EventEmitter<string>();
  @Output() threadOpen = new EventEmitter<string>();
  /** Click on a channel mention (`#channel`) within the message text. */
  @Output() channelMentionClick = new EventEmitter<string>();

  @ViewChild('emojiPicker', { read: ElementRef }) emojiPickerRef?: ElementRef;
  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtnRef?: ElementRef;
  @ViewChild('optionsMenu', { read: ElementRef }) optionsMenuRef?: ElementRef;
  @ViewChild('optionsBtn', { read: ElementRef }) optionsBtnRef?: ElementRef;
  @ViewChild('editTextarea', { read: ElementRef })
  editTextareaRef!: ElementRef<HTMLTextAreaElement>;

  activeUserData: User | null = null;
  senderData: User | null = null;
  groupedReactions: GroupedReaction[] = [];
  /** Pre-processed message text with highlighted mentions. */
  messageSegments: MessageSegment[] = [];
  shownReactionNumber = 7;
  editText = '';
  replyCount = 0;
  lastReplyTime: Timestamp | null = null;

  isEmojiPickerOpen = false;
  isOptionsOpen = false;
  isPermanentDeleteOpen = false;
  isEditOpen = false;

  ngOnInit(): void {
    this.loadSenderData();
    this.loadActiveUserData();
    this.regroupReactions();
    this.loadThreadInfo();
    this.loadMentionData();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['message']) {
      this.regroupReactions();
      this.loadThreadInfo();
      this.parseMessageText();
    }
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    this.threadSub?.unsubscribe();
    this.senderSub?.unsubscribe();
  }

  private loadSenderData() {
    this.senderSub?.unsubscribe();
    this.senderSub = this.userService
      .getUserRealtime(this.message.mSenderId!)
      .subscribe({
        next: (u) => {
          this.senderData = u;
          // The sender's account type (guest vs. registered) decides whether
          // URLs become clickable, so re-parse once the data has arrived.
          this.parseMessageText();
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Sender live subscription failed', err),
      });
  }

  private loadActiveUserData() {
    if (!this.activeUserId) return;
    this.userSub?.unsubscribe();
    this.userSub = this.userService
      .getUserRealtime(this.activeUserId)
      .subscribe({
        next: (u) => {
          this.activeUserData = u;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('User live subscription failed', err),
      });
  }

  private loadThreadInfo() {
    this.threadSub?.unsubscribe();
    this.replyCount = 0;
    this.lastReplyTime = null;

    if (!this.message.mThreadId || this.chatType === 'thread') return;

    this.threadSub = this.messageService
      .getThreadMessages(this.message.mThreadId)
      .subscribe((msgs) => {
        const replies = msgs.filter((m) => m.mId !== this.message.mId);
        this.replyCount = replies.length;
        this.lastReplyTime = (replies.at(-1)?.mTime as Timestamp) ?? null;
        this.cdr.markForCheck();
      });
  }

  regroupReactions() {
    this.groupedReactions =
      this.message.mReactions && this.activeUserId
        ? this.groupReactionsWithNames(
            this.message.mReactions,
            this.activeUserId
          )
        : [];
  }

  // ---- Mention processing --------------------------------------------------

  /** Known user/channel names used to resolve mentions. */
  private knownUsers: User[] = [];
  private knownChannels: Channel[] = [];

  /**
   * Loads all users and channels once so mentions in the message text can be
   * resolved to concrete ids, then parses the text.
   */
  private loadMentionData(): void {
    Promise.all([
      this.userService.getAllUsers(),
      this.channelService.getAllChannels(),
    ])
      .then(([users, channels]) => {
        this.knownUsers = users;
        this.knownChannels = channels;
        this.parseMessageText();
        this.cdr.markForCheck();
      })
      .catch((err) => console.error('Loading mention data failed', err));
  }

  /**
   * Splits `message.mText` into text and mention segments while honoring the
   * inline formatting tags `<b>`, `<i>` and `<u>` (plus their closing tags).
   * At every `@`/`#` position the text is matched against the known
   * user/channel names (supporting multi-word names like `@First Last`). The
   * raw text is never injected as HTML, so only this fixed set of tags has any
   * effect and arbitrary markup stays harmless plain text.
   */
  private parseMessageText(): void {
    const text = this.message?.mText ?? '';
    const segments: MessageSegment[] = [];
    const format: FormatState = {
      bold: false,
      italic: false,
      underline: false,
    };

    let plainStart = 0;
    let i = 0;

    while (i < text.length) {
      const symbol = text[i];
      const tag = symbol === '<' ? this.matchFormatTag(text, i) : null;
      const mention =
        symbol === '@' || symbol === '#'
          ? this.matchMentionAt(text, i, symbol, format)
          : null;

      if (tag) {
        this.pushPlainText(segments, text.slice(plainStart, i), format);
        format[tag.format] = tag.open;
        i += tag.length;
        plainStart = i;
      } else if (mention) {
        this.pushPlainText(segments, text.slice(plainStart, i), format);
        segments.push(mention.segment);
        i += mention.length;
        plainStart = i;
      } else {
        i++;
      }
    }

    this.pushPlainText(segments, text.slice(plainStart), format);
    this.messageSegments = segments;
  }

  private pushPlainText(
    segments: MessageSegment[],
    value: string,
    format: FormatState
  ): void {
    if (!value) return;

    // Guests' messages never get clickable links; their URLs and e-mail
    // addresses stay plain text.
    if (this.isSenderGuest()) {
      segments.push({ type: 'text', label: value, ...this.formatFlags(format) });
      return;
    }
    this.pushTextWithLinks(segments, value, format);
  }

  /**
   * Splits a plain-text chunk into text and `link` segments. Detects `http(s)`
   * and `www.` URLs as well as e-mail addresses. `www.` links get an `https://`
   * prefix and e-mails a `mailto:` prefix for the `href`; the original raw text
   * is kept as the visible label.
   */
  private pushTextWithLinks(
    segments: MessageSegment[],
    value: string,
    format: FormatState
  ): void {
    const linkRegex =
      /(https?:\/\/[^\s<]+|www\.[^\s<]+|(?:mailto:)?[^\s<@]+@[^\s<@]+\.[^\s<@]+)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(value)) !== null) {
      const raw = this.trimTrailingPunctuation(match[0]);
      const before = value.slice(lastIndex, match.index);
      if (before)
        segments.push({ type: 'text', label: before, ...this.formatFlags(format) });

      segments.push({
        type: 'link',
        // Strip a leading `mailto:` from the visible label for a clean look.
        label: raw.replace(/^mailto:/i, ''),
        href: this.buildHref(raw),
        ...this.formatFlags(format),
      });
      lastIndex = match.index + raw.length;
    }

    const tail = value.slice(lastIndex);
    if (tail)
      segments.push({ type: 'text', label: tail, ...this.formatFlags(format) });
  }

  /**
   * Builds the `href` for a detected link: `mailto:` for e-mail addresses
   * (avoiding a double prefix if the user already typed `mailto:`), `https://`
   * for `www.` links, otherwise the URL as-is.
   */
  private buildHref(raw: string): string {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('www.')) return `https://${raw}`;
    if (/^mailto:/i.test(raw)) return raw;
    return `mailto:${raw}`;
  }

  /** Removes trailing punctuation that is usually not part of a URL/e-mail. */
  private trimTrailingPunctuation(url: string): string {
    return url.replace(/[.,;:!?)\]}'"]+$/, '');
  }

  /** True when the message sender is an anonymous guest (no email). */
  private isSenderGuest(): boolean {
    return (this.senderData?.uEmail ?? '') === '';
  }

  /** Copies the current formatting state onto a fresh segment object. */
  private formatFlags(format: FormatState): Partial<MessageSegment> {
    return {
      bold: format.bold,
      italic: format.italic,
      underline: format.underline,
    };
  }

  /**
   * Detects a supported formatting tag (`<b>`, `<i>`, `<u>` or their closing
   * counterparts) at position `pos`. Returns the affected format key, whether
   * it opens or closes and the number of consumed characters, or `null`.
   */
  private matchFormatTag(
    text: string,
    pos: number
  ): { format: keyof FormatState; open: boolean; length: number } | null {
    const tags: { token: string; format: keyof FormatState; open: boolean }[] =
      [
        { token: '<b>', format: 'bold', open: true },
        { token: '</b>', format: 'bold', open: false },
        { token: '<i>', format: 'italic', open: true },
        { token: '</i>', format: 'italic', open: false },
        { token: '<u>', format: 'underline', open: true },
        { token: '</u>', format: 'underline', open: false },
      ];

    const lower = text.slice(pos, pos + 4).toLowerCase();
    for (const t of tags) {
      if (lower.startsWith(t.token))
        return { format: t.format, open: t.open, length: t.token.length };
    }
    return null;
  }

  /**
   * Tries to detect the longest matching known name at position `pos` (the
   * `@`/`#`). Returns the segment plus the number of consumed characters, or
   * `null` if no known mention starts there. Carries the active formatting so
   * a mention inside `<b>…</b>` is rendered bold too.
   */
  private matchMentionAt(
    text: string,
    pos: number,
    symbol: string,
    format: FormatState
  ): { segment: MessageSegment; length: number } | null {
    const rest = text.slice(pos + 1).toLowerCase();
    const candidates = this.mentionCandidates(symbol);

    for (const c of candidates) {
      if (rest.startsWith(c.lowerName)) {
        return {
          segment: {
            type: symbol === '@' ? 'user' : 'channel',
            // Always show the canonical original name, regardless of how the
            // user typed the mention (e.g. `@peter müller`).
            label: symbol + c.name,
            refId: c.id,
            ...this.formatFlags(format),
          },
          length: 1 + c.lowerName.length,
        };
      }
    }
    return null;
  }

  /**
   * Returns the name candidates matching the symbol, sorted by length
   * descending so that e.g. `@First Last` is matched before `@First`.
   */
  private mentionCandidates(
    symbol: string
  ): { name: string; lowerName: string; id: string }[] {
    const list =
      symbol === '@'
        ? this.knownUsers.map((u) => ({ name: u.uName, id: u.uId }))
        : this.knownChannels.map((c) => ({ name: c.cName, id: c.cId }));

    return list
      .filter((e) => e.name && e.id)
      .map((e) => ({
        name: e.name,
        lowerName: e.name.toLowerCase(),
        id: e.id as string,
      }))
      .sort((a, b) => b.lowerName.length - a.lowerName.length);
  }

  /** Handles a click on a mention in the rendered text. */
  onMentionClick(segment: MessageSegment): void {
    if (!segment.refId) return;
    if (segment.type === 'user') this.profileClick.emit(segment.refId);
    if (segment.type === 'channel')
      this.channelMentionClick.emit(segment.refId);
  }

  /**
   * Aggregates raw reactions by emoji into a view model, collecting the
   * reacting users' names (the active user shown as "Du") for the tooltip.
   */
  private groupReactionsWithNames(
    reactions: Reaction[],
    activeUserId: string
  ): GroupedReaction[] {
    const grouped = this.collectReactions(reactions, activeUserId);
    return this.mapBucketsToViewModel(grouped);
  }

  private collectReactions(
    reactions: Reaction[],
    activeUserId: string
  ): Map<string, { count: number; names: string[] }> {
    const grouped = new Map<string, { count: number; names: string[] }>();
    reactions.forEach((r) => {
      const key = r.reaction;
      const name = r.userId === activeUserId ? 'Du' : r.userName;
      const bucket = grouped.get(key) ?? { count: 0, names: [] };

      bucket.count++;
      if (!bucket.names.includes(name)) bucket.names.push(name);

      grouped.set(key, bucket);
    });
    return grouped;
  }

  private mapBucketsToViewModel(
    buckets: Map<string, { count: number; names: string[] }>
  ): GroupedReaction[] {
    return Array.from(buckets, ([reaction, data]) => ({
      reaction,
      count: data.count,
      names: data.names,
      namesLine: this.buildNameLine(data.names),
      actionLine: this.buildActionLine(data.names, data.count),
    }));
  }

  /**
   * Builds the "X, Y and Z" line for a reaction tooltip, pinning "Du" first and
   * collapsing overflow beyond `max` into a "and N more" suffix.
   */
  private buildNameLine(names: string[], max = 3): string {
    const list = [...names];
    const idxDu = list.indexOf('Du');
    if (idxDu > 0) {
      list.splice(idxDu, 1);
      list.unshift('Du');
    }

    if (list.length <= max) {
      return list.join(', ').replace(/, ([^,]*)$/, ' und $1');
    }
    const first = list.slice(0, max).join(', ');
    const rest = list.length - max;
    return `${first} und ${rest === 1 ? 'ein weiterer' : rest + ' weitere'}`;
  }

  private buildActionLine(names: string[], count: number): string {
    return count === 1
      ? names[0] === 'Du'
        ? 'hast reagiert'
        : 'hat reagiert'
      : 'haben reagiert';
  }

  setShownReactionNumber() {
    this.shownReactionNumber =
      this.shownReactionNumber < this.groupedReactions.length
        ? this.groupedReactions.length
        : 7;
  }

  getTimeInHours(ts: Timestamp | null): string | undefined {
    return ts instanceof Timestamp
      ? ts
          .toDate()
          .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : undefined;
  }

  getDayLabel(mTime: any): string {
    const date =
      mTime instanceof Date ? mTime : mTime?.toDate?.() ?? new Date(mTime);
    const todayMid = new Date().setHours(0, 0, 0, 0);
    const msgMid = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime();

    if (msgMid === todayMid) return 'Heute';
    if (msgMid === todayMid - 86400000) return 'Gestern';

    return this.formatAsGermanDate(date);
  }

  private formatAsGermanDate(d: Date): string {
    return (
      `${String(d.getDate()).padStart(2, '0')}.` +
      `${String(d.getMonth() + 1).padStart(2, '0')}.` +
      d.getFullYear()
    );
  }

  addReaction(reaction: string) {
    if (!this.message.mId || !this.activeUserId) return;

    this.userService
      .editLastReactions(this.activeUserId, reaction)
      .catch(console.error);

    this.messageService
      .toggleReaction(this.message.mId, {
        reaction,
        userId: this.activeUserId,
        userName: this.activeUserData?.uName ?? '',
      })
      .catch(console.error);
  }

  /**
   * Opens the thread for this message, starting a new thread first if the
   * message is not yet a thread root.
   */
  onThreadClick() {
    if (!this.message.mId) return;

    const tid = this.message.mThreadId || this.message.mId;
    const ensureThread = this.message.mThreadId
      ? Promise.resolve()
      : this.messageService.startThread(this.message.mId);

    ensureThread.then(() => {
      this.message.mThreadId = tid;
      this.threadOpen.emit(tid);
    });
  }

  openProfil() {
    if (this.message.mSenderId) this.profileClick.emit(this.message.mSenderId);
  }

  toggleEmojiPicker(e: MouseEvent) {
    e.stopPropagation();
    this.isEmojiPickerOpen = !this.isEmojiPickerOpen;
  }
  toggleOptions(e: MouseEvent) {
    e.stopPropagation();
    this.isOptionsOpen = !this.isOptionsOpen;
  }
  toggleEdit() {
    this.isEditOpen = !this.isEditOpen;
  }
  togglePermanentDelete() {
    this.isPermanentDeleteOpen = !this.isPermanentDeleteOpen;
  }

  /**
   * Inserts the picked emoji at the caret when editing, otherwise toggles it
   * as a reaction on the message.
   */
  onEmojiPicked(e: any) {
    const char = e.emoji?.native ?? e.emoji;
    if (this.isEditOpen && this.editTextareaRef) {
      const ta = this.editTextareaRef.nativeElement;
      const pos = ta.selectionStart ?? this.editText.length;
      this.editText =
        this.editText.slice(0, pos) + char + this.editText.slice(pos);
      setTimeout(() =>
        ta.setSelectionRange(pos + char.length, pos + char.length)
      );
      return;
    }
    this.addReaction(char);
    this.isEmojiPickerOpen = false;
  }

  /**
   * Toggles the given formatting tag (`b`, `i` or `u`) around the current
   * selection in the edit textarea: wraps on first press, removes the tags when
   * pressed again on an already-wrapped selection. With nothing selected an
   * empty tag pair is inserted. Mirrors the composer's `applyFormat`.
   */
  applyEditFormat(tag: FormatTag, event: MouseEvent) {
    event.preventDefault();
    const ta = this.editTextareaRef?.nativeElement;
    if (!ta) return;

    const start = ta.selectionStart ?? this.editText.length;
    const end = ta.selectionEnd ?? start;
    const result = toggleFormatTag(this.editText, start, end, tag);

    this.editText = result.text;
    setTimeout(() => {
      ta.setSelectionRange(result.selectionStart, result.selectionEnd);
      ta.focus();
    });
  }

  openEdit() {
    this.editText = this.message.mText ?? '';
    this.isEmojiPickerOpen = false;
    this.toggleEdit();
    setTimeout(() => this.editTextareaRef?.nativeElement.focus());
  }

  /** True when the edit input holds visible text beyond tags/whitespace. */
  get hasEditableText(): boolean {
    return hasVisibleContent(this.editText);
  }

  saveEdit() {
    if (!this.message.mId) return;
    // Reject edits that only contain styling markup (e.g. `<b></b>` or a lone
    // `<b>`); otherwise drop empty tag pairs from the text that is saved.
    if (!hasVisibleContent(this.editText)) return;
    const trimmed = stripEmptyFormatTags(this.editText).trim();
    if (!trimmed) return;

    if (trimmed === (this.message.mText ?? '').trim()) {
      this.closeEdit();
      return;
    }
    this.messageService
      .editMessageText(this.message.mId, trimmed)
      .then(() => {
        this.message.mText = trimmed;
        this.parseMessageText();
        this.closeEdit();
      })
      .catch(console.error);
  }

  private closeEdit() {
    this.isEditOpen = false;
    this.isOptionsOpen = false;
    this.isEmojiPickerOpen = false;
    this.cdr.markForCheck();
  }

  /** Closes the emoji picker / options menu when clicking outside of them. */
  @HostListener('document:click', ['$event'])
  handleDocumentClick(ev: MouseEvent): void {
    if (this.isPermanentDeleteOpen) return;

    const target = ev.target as HTMLElement;

    this.maybeCloseEmojiPicker(target);
    this.maybeCloseOptionsMenu(target);
  }

  private maybeCloseEmojiPicker(target: HTMLElement): void {
    if (
      this.isEmojiPickerOpen &&
      !this.elementContains(this.emojiPickerRef, target) &&
      !this.elementContains(this.emojiBtnRef, target)
    ) {
      this.isEmojiPickerOpen = false;
    }
  }

  private maybeCloseOptionsMenu(target: HTMLElement): void {
    if (
      this.isOptionsOpen &&
      !this.elementContains(this.optionsMenuRef, target) &&
      !this.elementContains(this.optionsBtnRef, target)
    ) {
      this.isOptionsOpen = false;
    }
  }

  private elementContains(
    ref: ElementRef | undefined,
    target: HTMLElement
  ): boolean {
    return ref?.nativeElement?.contains(target) ?? false;
  }
}
