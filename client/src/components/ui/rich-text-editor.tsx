import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image'
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  readOnly = false,
  minHeight = '200px',
  className,
  ...props
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Prevent hydration errors with React Quill
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only render the editor on the client side to prevent hydration errors
  if (!isMounted) {
    return (
      <div 
        className={cn(
          "border rounded-md w-full", 
          className
        )} 
        style={{ minHeight }}
        {...props}
      />
    );
  }
  
  return (
    <div className={cn("rich-text-editor-container", className)} {...props}>
      <ReactQuill
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        theme="snow"
        style={{ 
          height: 'auto',
          minHeight
        }}
      />
      
      <style>
        {`
          .ql-container {
            font-size: 1rem;
            min-height: ${minHeight};
            border-bottom-left-radius: 0.375rem;
            border-bottom-right-radius: 0.375rem;
          }
          
          .ql-toolbar {
            border-top-left-radius: 0.375rem;
            border-top-right-radius: 0.375rem;
          }
          
          .ql-editor {
            min-height: ${minHeight};
          }
        `}
      </style>
    </div>
  );
}