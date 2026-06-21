import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { Message } from '../../../../shared/interfaces/message.interface';
import { Timestamp } from '@angular/fire/firestore';
import { FirestoreTime } from '../../../../shared/interfaces/firestore.types';
import { UserService } from '../../../../shared/services/user.service';
import { ChannelService } from '../../../../shared/services/channel.service';
import { User } from '../../../../shared/interfaces/user.interface';
import { Channel } from '../../../../shared/interfaces/channel.interface';
import {
  GroupedReaction,
  Reaction,
} from '../../../../shared/interfaces/reaction.interface';
import { Subscription } from 'rxjs';
import { MessageService, ChatType } from '../../../../shared/services/message.service';
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
import {
  MessageSegment,
  parseMessageText,
} from '../../../../shared/utils/message-parse.util';

// NOTE: `<emoji-mart>` is only referenced inside a `@defer` block in the
// template. Angular therefore emits `@ctrl/ngx-emoji-mart` (and its CSS) as
// its own lazy chunk that is only fetched the first time the user opens the
// emoji picker.

// `MessageSegment` is defined in and re-exported from the message parser util
// so the rendering logic can live in a pure, unit-testable module.
export type { MessageSegment };

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
export class MessageComponent implements OnInit, OnChanges, OnDestroy {
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

  @Input() chatType: ChatType | null = null;
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

  ngOnDestroy(): void {
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
   * Parses `message.mText` into renderable segments via the pure message
   * parser util. Guests' messages get no clickable links. The raw text is
   * never injected as HTML, so arbitrary markup stays harmless plain text.
   */
  private parseMessageText(): void {
    this.messageSegments = parseMessageText(this.message?.mText ?? '', {
      users: this.knownUsers.map((u) => ({ name: u.uName, id: u.uId as string })),
      channels: this.knownChannels.map((c) => ({
        name: c.cName,
        id: c.cId as string,
      })),
      isGuestSender: this.isSenderGuest(),
    });
  }

  /** True when the message sender is an anonymous guest (no email). */
  private isSenderGuest(): boolean {
    return (this.senderData?.uEmail ?? '') === '';
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

  getTimeInHours(ts: FirestoreTime | null): string | undefined {
    return ts instanceof Timestamp
      ? ts
          .toDate()
          .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : undefined;
  }

  getDayLabel(mTime: FirestoreTime): string {
    const source = mTime as { toDate?: () => Date };
    const date =
      mTime instanceof Date ? mTime : source?.toDate?.() ?? new Date();
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
