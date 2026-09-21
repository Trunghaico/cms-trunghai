import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung tờ trình, căn cứ phê duyệt, điều khoản...',
  minHeight = '140px',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create an inner div for Quill to attach to
    const editorDiv = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(editorDiv);

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder: placeholder,
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'clean'],
        ],
      },
    });

    quillRef.current = quill;

    if (value) {
      quill.root.innerHTML = value;
    }

    quill.on('text-change', () => {
      isInternalChangeRef.current = true;
      const html = quill.root.innerHTML;
      onChange(html === '<p><br></p>' ? '' : html);
      isInternalChangeRef.current = false;
    });

    return () => {
      quillRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Update content if value changes externally
  useEffect(() => {
    if (quillRef.current && !isInternalChangeRef.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml && (value || currentHtml !== '<p><br></p>')) {
        quillRef.current.root.innerHTML = value || '';
      }
    }
  }, [value]);

  return (
    <div className="quill-editor-wrapper border border-slate-300 rounded-[3px] overflow-hidden bg-white shadow-2xs focus-within:ring-1 focus-within:ring-brand-blue focus-within:border-brand-blue transition-all">
      <style>{`
        .quill-editor-wrapper .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
          padding: 6px 8px;
          border-top-left-radius: 3px;
          border-top-right-radius: 3px;
        }
        .quill-editor-wrapper .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          font-size: 12px;
          min-height: ${minHeight};
        }
        .quill-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 10px 12px;
          line-height: 1.6;
        }
        .quill-editor-wrapper .ql-editor.ql-blank::before {
          font-style: normal;
          color: #94a3b8;
          font-size: 12px;
          left: 12px;
        }
        .quill-editor-wrapper .ql-snow .ql-stroke {
          stroke: #475569;
        }
        .quill-editor-wrapper .ql-snow .ql-fill {
          fill: #475569;
        }
        .quill-editor-wrapper .ql-snow .ql-picker {
          color: #475569;
          font-size: 12px;
        }
        .quill-editor-wrapper .ql-snow .ql-active .ql-stroke,
        .quill-editor-wrapper .ql-snow .ql-picker-label.ql-active {
          stroke: #3e4095 !important;
          color: #3e4095 !important;
        }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
};
