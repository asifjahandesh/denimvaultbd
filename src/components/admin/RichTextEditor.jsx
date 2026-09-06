import React, { useRef, useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Type,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Eraser,
  Code,
  Eye,
  Edit3,
  Palette
} from 'lucide-react'

const COLOR_PALETTE = [
  { name: 'Black (Default)', value: '#1e293b' },
  { name: 'Rose / Red', value: '#e11d48' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Amber / Orange', value: '#d97706' },
  { name: 'Slate / Gray', value: '#64748b' }
]

const FONT_SIZES = [
  { label: 'Normal', value: '3' },
  { label: 'Small', value: '2' },
  { label: 'Medium', value: '4' },
  { label: 'Large', value: '5' },
  { label: 'Heading', value: '6' }
]

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write product description here...' }) {
  const editorRef = useRef(null)
  const [activeTab, setActiveTab] = useState('visual') // 'visual', 'code', 'preview'
  const [selectedColor, setSelectedColor] = useState('#1e293b')
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Sync incoming value to editor contentEditable div when external value changes
  useEffect(() => {
    if (editorRef.current && activeTab === 'visual') {
      const currentHtml = editorRef.current.innerHTML
      if (value !== currentHtml) {
        // If empty or plain text, load it
        editorRef.current.innerHTML = value || ''
      }
    }
  }, [value, activeTab])

  // Execute formatting commands
  const executeCommand = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
    document.execCommand(command, false, val)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  // Color change handler
  const handleColorChange = (color) => {
    setSelectedColor(color)
    executeCommand('foreColor', color)
    setShowColorPicker(false)
  }

  // Font size change handler
  const handleFontSizeChange = (sizeVal) => {
    executeCommand('fontSize', sizeVal)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:border-rose-400 transition-all">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Bold */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Underline (Ctrl+U)"
          >
            <Underline size={15} />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Font Size Selector */}
          <div className="flex items-center gap-1">
            <Type size={14} className="text-slate-400 ml-1" />
            <select
              onChange={(e) => handleFontSizeChange(e.target.value)}
              disabled={activeTab !== 'visual'}
              defaultValue="3"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 outline-none hover:border-slate-300 disabled:opacity-40"
              title="Select font size"
            >
              {FONT_SIZES.map((fs) => (
                <option key={fs.value} value={fs.value}>
                  {fs.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Color Selector Dropdown / Palette */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              disabled={activeTab !== 'visual'}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-slate-300 disabled:opacity-40"
              title="Change text color"
            >
              <span
                className="h-3 w-3 rounded-full border border-slate-300 shadow-xs"
                style={{ backgroundColor: selectedColor }}
              />
              <Palette size={13} className="text-slate-500" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl">
                <div className="text-[10px] font-bold text-slate-400 mb-2">Select Color:</div>
                <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleColorChange(c.value)}
                      className="h-6 w-full rounded-md border border-slate-200 hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="text-[10px] font-bold text-slate-500">Custom Color:</span>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Bullet List"
          >
            <List size={15} />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>

          {/* Align Left */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>

          {/* Align Center */}
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-rose-600 hover:shadow-xs transition-all disabled:opacity-40"
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>

          {/* Remove Formatting */}
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            disabled={activeTab !== 'visual'}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-xs transition-all disabled:opacity-40"
            title="Clear Formatting"
          >
            <Eraser size={15} />
          </button>
        </div>

        {/* View Switcher Tabs (Visual / HTML / Preview) */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-all ${
              activeTab === 'visual'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 size={11} />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-all ${
              activeTab === 'code'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code size={11} />
            HTML Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye size={11} />
            Preview
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-3">
        {/* 1. Visual WYSIWYG Editor */}
        {activeTab === 'visual' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder={placeholder}
            className="min-h-[140px] max-h-[300px] overflow-y-auto px-1 py-1 text-xs sm:text-sm text-slate-800 leading-relaxed outline-none prose prose-slate max-w-none 
              [&_font[size='2']]:text-xs 
              [&_font[size='3']]:text-sm 
              [&_font[size='4']]:text-base 
              [&_font[size='5']]:text-lg [&_font[size='5']]:font-bold 
              [&_font[size='6']]:text-xl [&_font[size='6']]:font-black
              [&_b]:font-bold [&_strong]:font-bold 
              [&_i]:italic [&_em]:italic 
              [&_u]:underline 
              [&_ul]:list-disc [&_ul]:ml-4 
              [&_ol]:list-decimal [&_ol]:ml-4
              empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
          />
        )}

        {/* 2. Raw HTML Code View */}
        {activeTab === 'code' && (
          <textarea
            rows={6}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<p>Enter HTML code here...</p>"
            className="w-full min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:border-rose-400"
          />
        )}

        {/* 3. Live Customer View Preview */}
        {activeTab === 'preview' && (
          <div className="min-h-[140px] max-h-[300px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Customer View (Live Preview):
            </div>
            {value ? (
              <div
                className="text-xs sm:text-sm text-slate-800 leading-relaxed prose prose-slate max-w-none 
                  [&_font[size='2']]:text-xs 
                  [&_font[size='3']]:text-sm 
                  [&_font[size='4']]:text-base 
                  [&_font[size='5']]:text-lg [&_font[size='5']]:font-bold 
                  [&_font[size='6']]:text-xl [&_font[size='6']]:font-black
                  [&_b]:font-bold [&_strong]:font-bold 
                  [&_i]:italic [&_em]:italic 
                  [&_u]:underline 
                  [&_ul]:list-disc [&_ul]:ml-4 
                  [&_ol]:list-decimal [&_ol]:ml-4"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className="text-xs text-slate-400 italic">No description written yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Helper Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 bg-slate-50/50 text-[10px] text-slate-400">
        <span>Select text to apply bold, italic, font size, or color formatting.</span>
        <span className="font-semibold text-slate-500">HTML Rich Text Active</span>
      </div>
    </div>
  )
}
