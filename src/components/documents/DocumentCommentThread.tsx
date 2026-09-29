import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  AtSign, 
  Trash2, 
  Download, 
  Eye, 
  X, 
  MessageSquare, 
  Sparkles, 
  CheckCheck, 
  User as UserIcon, 
  Clock, 
  Building2, 
  Loader2,
  FileText
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { DocumentItem, DocumentComment, DocumentCommentAttachment, User } from '../../types';
import { formatDate } from '../../lib/storage';
import { uploadFileToNAS } from '../../lib/nasStorageService';
import { compressAndCropAvatar } from '../../lib/imageUtils';

interface DocumentCommentThreadProps {
  document: DocumentItem;
}

export const DocumentCommentThread: React.FC<DocumentCommentThreadProps> = ({ document: doc }) => {
  const { activeUser, users, addDocumentComment, deleteDocumentComment } = useDocument();

  const [messageText, setMessageText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<DocumentCommentAttachment[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<{ id: string; name: string }[]>([]);
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imgMouseDownTargetRef = useRef<EventTarget | null>(null);

  const comments = doc.comments || [];

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments.length]);

  // Tập hợp danh sách người tham gia trong hồ sơ để ưu tiên gợi ý tag @
  const participants = React.useMemo(() => {
    const list: { id: string; name: string; roleTitle?: string; department?: string; avatar?: string; isRelated: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Người lập
    if (doc.creatorId && !seen.has(doc.creatorId)) {
      seen.add(doc.creatorId);
      const u = users.find(x => x.id === doc.creatorId);
      list.push({
        id: doc.creatorId,
        name: doc.creatorName,
        roleTitle: doc.creatorTitle || u?.roleTitle,
        department: doc.department || u?.department,
        avatar: u?.avatar,
        isRelated: true
      });
    }

    // 2. Các người duyệt trong các bước
    doc.steps.forEach(step => {
      if (step.approverId && !seen.has(step.approverId)) {
        seen.add(step.approverId);
        const u = users.find(x => x.id === step.approverId);
        list.push({
          id: step.approverId,
          name: step.approverName || u?.name || '',
          roleTitle: step.approverTitle || u?.roleTitle,
          department: step.department || u?.department,
          avatar: u?.avatar,
          isRelated: true
        });
      }
    });

    // 3. Người theo dõi (Cc)
    if (doc.ccUsers && Array.isArray(doc.ccUsers)) {
      doc.ccUsers.forEach(cc => {
        if (!seen.has(cc.id)) {
          seen.add(cc.id);
          const u = users.find(x => x.id === cc.id);
          list.push({
            id: cc.id,
            name: cc.name,
            roleTitle: cc.roleTitle || u?.roleTitle,
            department: cc.department || u?.department,
            avatar: cc.avatar || u?.avatar,
            isRelated: true
          });
        }
      });
    }

    // 4. Bổ sung tất cả user còn lại trong công ty
    users.forEach(u => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push({
          id: u.id,
          name: u.name,
          roleTitle: u.roleTitle,
          department: u.department,
          avatar: u.avatar,
          isRelated: false
        });
      }
    });

    return list;
  }, [doc, users]);

  // Lọc danh sách mention theo từ khóa
  const filteredParticipants = React.useMemo(() => {
    if (!mentionFilter) return participants;
    const q = mentionFilter.toLowerCase();
    return participants.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.department && p.department.toLowerCase().includes(q)) ||
      (p.roleTitle && p.roleTitle.toLowerCase().includes(q))
    );
  }, [participants, mentionFilter]);

  // Xử lý khi gõ text, phát hiện ký tự @ để mở menu tag
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageText(val);

    // Kiểm tra vị trí con trỏ xem có đang ở sau ký tự @ không
    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const query = textBeforeCursor.slice(lastAtIdx + 1);
      // Hỗ trợ tìm kiếm cả cụm từ có dấu cách (VD: @Phan Thanh), không xuống dòng, tối đa 30 ký tự
      if (!query.includes('\n') && query.length <= 30) {
        setMentionFilter(query.trim());
        setIsMentionMenuOpen(true);
        return;
      }
    }
    setIsMentionMenuOpen(false);
  };

  // Chọn một nhân sự từ danh sách mention
  const handleSelectMention = (user: { id: string; name: string }) => {
    const cursor = textareaRef.current?.selectionStart || messageText.length;
    const textBeforeCursor = messageText.slice(0, cursor);
    const textAfterCursor = messageText.slice(cursor);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    let newTextBefore = '';
    if (lastAtIdx !== -1) {
      newTextBefore = textBeforeCursor.slice(0, lastAtIdx) + `@${user.name} `;
    } else {
      newTextBefore = textBeforeCursor + (textBeforeCursor.endsWith(' ') || textBeforeCursor === '' ? '' : ' ') + `@${user.name} `;
    }
    const finalVal = newTextBefore + textAfterCursor;

    setMessageText(finalVal);
    if (!selectedMentions.some(m => m.id === user.id)) {
      setSelectedMentions(prev => [...prev, user]);
    }
    setIsMentionMenuOpen(false);
    setMentionFilter('');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Hàm render nội dung tin nhắn với highlight đầy đủ cả họ và tên người được tag (@Họ Và Tên)
  const renderCommentContent = (
    content: string, 
    mentions?: { id: string; name: string }[], 
    isMe?: boolean
  ) => {
    if (!content) return null;

    // Thu thập danh sách tên nhân sự khả dĩ để nhận diện chính xác
    const nameSet = new Set<string>();
    if (mentions && Array.isArray(mentions)) {
      mentions.forEach(m => {
        if (m.name && m.name.trim()) nameSet.add(m.name.trim());
      });
    }
    users.forEach(u => {
      if (u.name && u.name.trim()) nameSet.add(u.name.trim());
    });

    // Sắp xếp tên theo độ dài giảm dần để tên dài nhất được match trước
    const sortedNames = Array.from(nameSet).sort((a, b) => b.length - a.length);
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let mentionRegex: RegExp;
    if (sortedNames.length > 0) {
      const namesPattern = sortedNames.map(escapeRegex).join('|');
      mentionRegex = new RegExp(`(@(?:${namesPattern})|@[\\p{L}\\p{N}_\\-\\.]+)(?=[\\s,.:;!?)]|$)`, 'gu');
    } else {
      mentionRegex = /(@[\p{L}\\p{N}_\\-\\.]+)(?=[\\s,.:;!?)]|$)/gu;
    }

    const parts: { text: string; isMention: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      if (matchStart > lastIndex) {
        parts.push({
          text: content.slice(lastIndex, matchStart),
          isMention: false
        });
      }

      parts.push({
        text: match[0],
        isMention: true
      });

      lastIndex = matchEnd;
    }

    if (lastIndex < content.length) {
      parts.push({
        text: content.slice(lastIndex),
        isMention: false
      });
    }

    return (
      <div className="whitespace-pre-wrap font-normal select-text leading-relaxed">
        {parts.map((part, idx) => {
          if (part.isMention) {
            return (
              <span
                key={idx}
                className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded-lg mx-0.5 text-[11.5px] tracking-tight ${
                  isMe
                    ? 'bg-white/25 text-white underline decoration-white/50 shadow-2xs'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200/90 shadow-2xs'
                }`}
              >
                {part.text}
              </span>
            );
          }
          return <React.Fragment key={idx}>{part.text}</React.Fragment>;
        })}
      </div>
    );
  };

  // Hỗ trợ Paste ảnh chụp màn hình từ Clipboard (Ctrl + V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processAndUploadImage(file);
        }
      }
    }
  };

  // Xử lý nén và tải ảnh lên
  const processAndUploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const localDataUrl = event.target?.result as string;
        let finalUrl = localDataUrl;

        // Tải lên NAS MinIO nếu có kết nối
        try {
          const fileName = `chat_img_${doc.code}_${Date.now()}.png`;
          const nasRes = await uploadFileToNAS(file, fileName);
          if (nasRes && nasRes.url) {
            finalUrl = nasRes.url;
          }
        } catch {
          // Fallback giữ nguyên base64
        }

        const newAtt: DocumentCommentAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: file.name || 'Ảnh chụp màn hình.png',
          url: finalUrl,
          type: 'image',
          size: file.size
        };

        setPendingAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Lỗi khi tải ảnh thảo luận:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Tải tệp tài liệu thông thường
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith('image/');

        const reader = new FileReader();
        reader.onload = async (event) => {
          const localUrl = event.target?.result as string;
          let finalUrl = localUrl;

          try {
            const fileName = `chat_file_${doc.code}_${Date.now()}_${file.name}`;
            const nasRes = await uploadFileToNAS(file, fileName);
            if (nasRes && nasRes.url) {
              finalUrl = nasRes.url;
            }
          } catch {
            // fallback
          }

          const newAtt: DocumentCommentAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: file.name,
            url: finalUrl,
            type: isImg ? 'image' : 'file',
            size: file.size
          };

          setPendingAttachments(prev => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Lỗi khi đính kèm file chat:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Gửi tin nhắn thảo luận
  const handleSendMessage = () => {
    if (!messageText.trim() && pendingAttachments.length === 0) return;
    if (!activeUser) return;

    // Tự động phát hiện thêm bất kỳ @Tên nào có trong nội dung tin nhắn nếu người dùng gõ tay
    const allMentions = [...selectedMentions];
    users.forEach(u => {
      if (
        (messageText.includes(`@${u.name}`) || messageText.includes(`@${u.username}`)) &&
        !allMentions.some(m => m.id === u.id)
      ) {
        allMentions.push({ id: u.id, name: u.name });
      }
    });

    addDocumentComment(
      doc.id,
      messageText,
      pendingAttachments,
      allMentions
    );

    setMessageText('');
    setPendingAttachments([]);
    setSelectedMentions([]);
    setIsMentionMenuOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      scrollToBottom();
    }, 50);
  };

  // Phím tắt Enter để gửi (Shift+Enter để xuống dòng)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape' && isMentionMenuOpen) {
      setIsMentionMenuOpen(false);
    }
  };

  // Gợi ý nhanh câu trả lời mẫu
  const handleQuickPrompt = (prompt: string) => {
    setMessageText(prev => prev ? `${prev} ${prompt}` : prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[520px] max-h-[70vh] bg-slate-50/70 rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
      
      {/* Top Header Bar of Chat Thread */}
      <div className="px-4 py-3 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Thảo Luận & Trao Đổi Nội Bộ</span>
              <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10.5px] font-extrabold">
                {comments.length}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              Lưu vết trao đổi, làm rõ số liệu và giải trình trực tiếp trên hồ sơ
            </p>
          </div>
        </div>

        {/* Participants Avatars Stack */}
        <div className="flex items-center -space-x-1.5 shrink-0 hidden sm:flex" title="Nhân sự tham gia theo dõi hồ sơ">
          {participants.filter(p => p.isRelated).slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center font-bold text-[10px] text-indigo-700 shadow-2xs overflow-hidden"
              title={`${p.name} (${p.roleTitle || p.department})`}
            >
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                p.name.charAt(0)
              )}
            </div>
          ))}
          {participants.filter(p => p.isRelated).length > 5 && (
            <span className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
              +{participants.filter(p => p.isRelated).length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5 text-slate-400">
            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h5 className="text-xs font-bold text-slate-700">Chưa có trao đổi nào trên hồ sơ này</h5>
            <p className="text-[11.5px] text-slate-500 max-w-sm leading-relaxed">
              Các câu hỏi, yêu cầu làm rõ điều khoản hoặc tài liệu bổ sung nhanh giữa Người lập và các Cấp phê duyệt có thể nhắn trực tiếp tại đây để lưu lại lịch sử.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt('Hồ sơ đã được rà soát đầy đủ số liệu theo bảng nghiệm thu.')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-full text-[11px] text-slate-600 font-medium transition-colors cursor-pointer"
              >
                💡 "Đã rà soát đủ số liệu"
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('Nhờ Kế toán trưởng xem xét đối chiếu số dư thanh toán đợt này.')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-full text-[11px] text-slate-600 font-medium transition-colors cursor-pointer"
              >
                💡 "Nhờ đối chiếu số dư"
              </button>
            </div>
          </div>
        ) : (
          comments.map((cmt) => {
            const isMe = activeUser?.id === cmt.senderId;

            return (
              <div
                key={cmt.id}
                className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-700 shrink-0 overflow-hidden shadow-2xs">
                  {cmt.senderAvatar ? (
                    <img src={cmt.senderAvatar} alt={cmt.senderName} className="w-full h-full object-cover" />
                  ) : (
                    cmt.senderName.charAt(0)
                  )}
                </div>

                {/* Message Bubble Content */}
                <div className={`max-w-[82%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                  
                  {/* Sender Metadata */}
                  <div className={`flex items-center gap-1.5 text-[10.5px] text-slate-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-bold text-slate-800">{isMe ? 'Bạn' : cmt.senderName}</span>
                    {cmt.senderTitle && (
                      <span className="text-[9.5px] px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-md font-medium">
                        {cmt.senderTitle}
                      </span>
                    )}
                    <span className="text-slate-400 font-mono text-[10px]">• {formatDate(cmt.createdAt)}</span>
                    
                    {/* Delete comment button */}
                    {(isMe || activeUser?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => deleteDocumentComment(doc.id, cmt.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 rounded transition-opacity cursor-pointer"
                        title="Xóa tin nhắn"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs break-words text-left ${
                      isMe
                        ? 'bg-gradient-to-r from-brand-blue to-indigo-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                    }`}
                  >
                    {/* Text with complete full-name @mention highlighting */}
                    {renderCommentContent(cmt.content, cmt.mentions, isMe)}

                    {/* Image Attachments */}
                    {cmt.attachments && cmt.attachments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/20 space-y-2">
                        {cmt.attachments.map((att) => (
                          <div key={att.id}>
                            {att.type === 'image' ? (
                              <div className="relative group/img overflow-hidden rounded-xl border border-white/30 max-w-sm">
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  onClick={() => setPreviewImage(att.url)}
                                  className="w-full max-h-56 object-cover cursor-pointer hover:scale-102 transition-transform duration-200 bg-slate-900"
                                />
                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  <span>Xem ảnh</span>
                                </div>
                              </div>
                            ) : (
                              <a
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs font-semibold transition-colors ${
                                  isMe
                                    ? 'bg-white/15 hover:bg-white/25 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </div>
                                <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Attachments Bar */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50/90 border-t border-indigo-100 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-bold text-indigo-900 shrink-0">Tệp chuẩn bị gửi:</span>
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs shrink-0"
            >
              {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                type="button"
                onClick={() => setPendingAttachments(prev => prev.filter(p => p.id !== att.id))}
                className="text-slate-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention Auto-complete Menu */}
      {isMentionMenuOpen && (
        <div className="px-3 py-2 bg-white border-t border-slate-200 shadow-lg max-h-48 overflow-y-auto custom-scrollbar shrink-0 animate-scale-up">
          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100">
            <p className="text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <AtSign className="w-3 h-3 text-indigo-600" />
              <span>Nhắc tên đồng nghiệp (@Mention)</span>
            </p>
            <span className="text-[10px] text-slate-400">Gõ tên hoặc chọn bên dưới</span>
          </div>
          <div className="space-y-1">
            {filteredParticipants.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">Không tìm thấy nhân sự phù hợp.</p>
            ) : (
              filteredParticipants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectMention(p)}
                  className="w-full flex items-center justify-between p-1.5 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden">
                      {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700">{p.name}</p>
                        {p.isRelated && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold shrink-0">
                            Trong hồ sơ
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{p.roleTitle || p.department}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-brand-blue bg-blue-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full border border-blue-200 group-hover:border-indigo-600 transition-colors">
                    Tag @
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Input Message Form */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
        
        {/* Quick Toolbar */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMentionMenuOpen(!isMentionMenuOpen)}
              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold text-[11px]"
              title="Tag tên người duyệt / người lập (@)"
            >
              <AtSign className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Nhắc tên (@)</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold text-[11px]"
              title="Tải ảnh / chụp màn hình"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Gửi ảnh</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold text-[11px]"
              title="Đính kèm tệp tài liệu"
            >
              <Paperclip className="w-3.5 h-3.5 text-brand-blue" />
              <span className="hidden sm:inline">Kèm tệp</span>
            </button>

            {isUploading && (
              <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang tải tệp...</span>
              </span>
            )}
          </div>

          <span className="text-[10.5px] text-slate-400 hidden sm:inline">
            Nhấn <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono border">Enter</kbd> gửi, <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono border">Shift+Enter</kbd> xuống dòng
          </span>
        </div>

        {/* Input Text Area + Send Button */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={messageText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Nhập nội dung trao đổi, góp ý hoặc giải trình... (Có thể dán ảnh chụp màn hình Ctrl+V)"
            className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-2xs"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageText.trim() && pendingAttachments.length === 0}
            className="p-2.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white rounded-xl shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center transform active:scale-95"
            title="Gửi tin nhắn (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

      </div>

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onMouseDown={(e) => {
            imgMouseDownTargetRef.current = e.target;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && imgMouseDownTargetRef.current === e.currentTarget) {
              setPreviewImage(null);
            }
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewImage}
              alt="Xem ảnh"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 font-bold text-sm bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
