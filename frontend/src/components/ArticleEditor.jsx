import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ArticleEditor = ({ value, onChange, placeholder = 'Write your article content here...' }) => {
  const [content, setContent] = useState(value || '');

  const handleChange = (html) => {
    setContent(html);
    onChange(html);
  };

  // Custom toolbar configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  // Allowed formats – matches toolbar
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'link', 'image'
  ];

  return (
    <div className="article-editor">
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        className="bg-white dark:bg-gray-800 rounded-lg"
      />
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
        <span>{content?.length || 0} characters</span>
        <span>Use the toolbar above to format your article.</span>
      </div>
    </div>
  );
};

export default ArticleEditor;