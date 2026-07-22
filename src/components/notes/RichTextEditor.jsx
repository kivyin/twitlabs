import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import NotesUrlModal from "./NotesUrlModal";
import { toolbarIcons } from "./tiptapToolbarIcons";

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#111827" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#059669" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Lime", value: "#d9f99d" },
  { label: "Cyan", value: "#a5f3fc" },
  { label: "Sky", value: "#bae6fd" },
  { label: "Violet", value: "#ddd6fe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans", value: "Inter, Segoe UI, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, serif" },
  { label: "Mono", value: "SFMono-Regular, Consolas, monospace" },
];

const FONT_SIZES = [
  { label: "Size", value: "" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "32", value: "32px" },
];

const BLOCK_OPTIONS = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "heading:1" },
  { label: "Heading 2", value: "heading:2" },
  { label: "Heading 3", value: "heading:3" },
  { label: "Heading 4", value: "heading:4" },
  { label: "Code block", value: "codeBlock" },
];

function normalizeEditorHtml(html = "") {
  const trimmed = String(html).trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return "";
  }
  return html;
}

function ToolbarButton({ title, active = false, disabled = false, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      className={`tiptap-toolbar-button${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="tiptap-toolbar-divider" aria-hidden="true" />;
}

function getBlockValue(editor) {
  if (!editor) return "paragraph";
  if (editor.isActive("codeBlock")) return "codeBlock";
  for (const level of [1, 2, 3, 4]) {
    if (editor.isActive("heading", { level })) return `heading:${level}`;
  }
  return "paragraph";
}

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    value = "",
    onChange,
    placeholder = "Start writing...",
    showGrid = false,
    mixed = false,
    overlay = null,
    textActive = true,
  },
  ref
) {
  const [urlModal, setUrlModal] = useState(null);
  const [, setToolbarTick] = useState(0);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      Subscript,
      Superscript,
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "tiptap-image" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || "",
    editable: textActive,
    editorProps: {
      attributes: {
        class: [
          "rich-text-surface",
          "tiptap-surface",
          mixed ? "rich-text-surface--mixed" : "",
          !mixed && showGrid ? "note-surface--grid" : "",
        ]
          .filter(Boolean)
          .join(" "),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML());
    },
    onSelectionUpdate: () => {
      setToolbarTick((tick) => tick + 1);
    },
    onTransaction: () => {
      setToolbarTick((tick) => tick + 1);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: (options = {}) => {
        editor?.commands.focus("end", {
          scrollIntoView: options.preventScroll !== true,
        });
      },
      blur: () => editor?.commands.blur(),
      getHTML: () => editor?.getHTML() ?? "",
      editor,
    }),
    [editor]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(Boolean(textActive));
  }, [editor, textActive]);

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: [
            "rich-text-surface",
            "tiptap-surface",
            mixed ? "rich-text-surface--mixed" : "",
            !mixed && showGrid ? "note-surface--grid" : "",
          ]
            .filter(Boolean)
            .join(" "),
          role: "textbox",
          "aria-multiline": "true",
        },
      },
    });
  }, [editor, mixed, showGrid]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    const nextValue = value || "";
    const current = editor.getHTML();
    if (normalizeEditorHtml(current) !== normalizeEditorHtml(nextValue)) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  const disabled = !editor || (!textActive && mixed);
  const inTable = Boolean(editor?.isActive("table"));
  const currentColor = editor?.getAttributes("textStyle").color || "";
  const currentHighlight = editor?.getAttributes("highlight").color || "";
  const currentFont = editor?.getAttributes("textStyle").fontFamily || "";
  const currentFontSize = editor?.getAttributes("textStyle").fontSize || "";
  const currentBlock = getBlockValue(editor);

  const handleUrlSubmit = (url) => {
    if (!editor) return;
    if (urlModal === "link") {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      return;
    }
    if (urlModal === "image") {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setBlockType = (value) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    if (value === "codeBlock") {
      chain.toggleCodeBlock().run();
      return;
    }
    if (value.startsWith("heading:")) {
      chain.toggleHeading({ level: Number(value.split(":")[1]) }).run();
    }
  };

  const stageClassName = [
    mixed ? "rich-text-stage" : "",
    mixed && showGrid ? "note-surface--grid" : "",
    mixed && textActive ? "rich-text-stage--typing" : "",
    mixed && !textActive ? "rich-text-stage--drawing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const editorContent = (
    <EditorContent
      editor={editor}
      className="rich-text-editor-content"
      onMouseDown={() => {
        if (!textActive || !editor) return;
        editor.commands.focus();
      }}
    />
  );

  return (
    <div className={`rich-text-editor tiptap-editor${mixed ? " rich-text-editor--mixed" : ""}`}>
      <div className="tiptap-toolbar" role="toolbar" aria-label="TipTap formatting toolbar">
        <div className="tiptap-toolbar-group">
          <ToolbarButton
            title="Undo"
            disabled={disabled || !editor?.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            {toolbarIcons.undo}
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={disabled || !editor?.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            {toolbarIcons.redo}
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <label className="tiptap-toolbar-select-wrap" title="Block type">
            <select
              className="tiptap-toolbar-select"
              value={currentBlock}
              disabled={disabled}
              onChange={(event) => setBlockType(event.target.value)}
              aria-label="Block type"
            >
              {BLOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="tiptap-toolbar-select-wrap" title="Font">
            <select
              className="tiptap-toolbar-select"
              value={currentFont}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  editor.chain().focus().unsetFontFamily().run();
                } else {
                  editor.chain().focus().setFontFamily(next).run();
                }
              }}
              aria-label="Font family"
            >
              {FONT_FAMILIES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="tiptap-toolbar-select-wrap" title="Font size">
            <select
              className="tiptap-toolbar-select tiptap-toolbar-select--size"
              value={currentFontSize}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(next).run();
                }
              }}
              aria-label="Font size"
            >
              {FONT_SIZES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <ToolbarButton
            title="Bold"
            active={editor?.isActive("bold")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            {toolbarIcons.bold}
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor?.isActive("italic")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            {toolbarIcons.italic}
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={editor?.isActive("underline")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            {toolbarIcons.underline}
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor?.isActive("strike")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            {toolbarIcons.strike}
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={editor?.isActive("code")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {toolbarIcons.code}
          </ToolbarButton>
          <ToolbarButton
            title="Subscript"
            active={editor?.isActive("subscript")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            {toolbarIcons.subscript}
          </ToolbarButton>
          <ToolbarButton
            title="Superscript"
            active={editor?.isActive("superscript")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            {toolbarIcons.superscript}
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <label className="tiptap-color-control" title="Text color">
            <span className="tiptap-color-swatch" style={{ background: currentColor || "currentColor" }}>
              {toolbarIcons.color}
            </span>
            <select
              value={currentColor}
              disabled={disabled}
              aria-label="Text color"
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(next).run();
                }
              }}
            >
              {TEXT_COLORS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="tiptap-color-control" title="Highlight">
            <span
              className="tiptap-color-swatch tiptap-color-swatch--highlight"
              style={{ background: currentHighlight || "transparent" }}
            >
              {toolbarIcons.highlight}
            </span>
            <select
              value={currentHighlight}
              disabled={disabled}
              aria-label="Highlight color"
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  editor.chain().focus().unsetHighlight().run();
                } else {
                  editor.chain().focus().toggleHighlight({ color: next }).run();
                }
              }}
            >
              {HIGHLIGHT_COLORS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <ToolbarButton
            title="Bullet list"
            active={editor?.isActive("bulletList")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            {toolbarIcons.bulletList}
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={editor?.isActive("orderedList")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            {toolbarIcons.orderedList}
          </ToolbarButton>
          <ToolbarButton
            title="Task list"
            active={editor?.isActive("taskList")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            {toolbarIcons.taskList}
          </ToolbarButton>
          <ToolbarButton
            title="Block quote"
            active={editor?.isActive("blockquote")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            {toolbarIcons.blockquote}
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor?.isActive("codeBlock")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {toolbarIcons.codeBlock}
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal rule"
            disabled={disabled}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            {toolbarIcons.hr}
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <ToolbarButton
            title="Align left"
            active={editor?.isActive({ textAlign: "left" })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            {toolbarIcons.alignLeft}
          </ToolbarButton>
          <ToolbarButton
            title="Align center"
            active={editor?.isActive({ textAlign: "center" })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            {toolbarIcons.alignCenter}
          </ToolbarButton>
          <ToolbarButton
            title="Align right"
            active={editor?.isActive({ textAlign: "right" })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            {toolbarIcons.alignRight}
          </ToolbarButton>
          <ToolbarButton
            title="Justify"
            active={editor?.isActive({ textAlign: "justify" })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            {toolbarIcons.alignJustify}
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="tiptap-toolbar-group">
          <ToolbarButton
            title="Insert link"
            active={editor?.isActive("link")}
            disabled={disabled}
            onClick={() => setUrlModal("link")}
          >
            {toolbarIcons.link}
          </ToolbarButton>
          <ToolbarButton
            title="Remove link"
            disabled={disabled || !editor?.isActive("link")}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            {toolbarIcons.unlink}
          </ToolbarButton>
          <ToolbarButton title="Insert image" disabled={disabled} onClick={() => setUrlModal("image")}>
            {toolbarIcons.image}
          </ToolbarButton>
          <ToolbarButton
            title="Insert table"
            active={inTable}
            disabled={disabled}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            {toolbarIcons.table}
          </ToolbarButton>
          <ToolbarButton
            title="Clear formatting"
            disabled={disabled}
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            {toolbarIcons.clear}
          </ToolbarButton>
        </div>

        {inTable && (
          <>
            <ToolbarDivider />
            <div className="tiptap-toolbar-group">
              <ToolbarButton
                title="Add column before"
                disabled={disabled}
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                {toolbarIcons.addColBefore}
              </ToolbarButton>
              <ToolbarButton
                title="Add column after"
                disabled={disabled}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                {toolbarIcons.addColAfter}
              </ToolbarButton>
              <ToolbarButton
                title="Delete column"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                {toolbarIcons.deleteCol}
              </ToolbarButton>
              <ToolbarButton
                title="Add row before"
                disabled={disabled}
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                {toolbarIcons.addRowBefore}
              </ToolbarButton>
              <ToolbarButton
                title="Add row after"
                disabled={disabled}
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                {toolbarIcons.addRowAfter}
              </ToolbarButton>
              <ToolbarButton
                title="Delete row"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                {toolbarIcons.deleteRow}
              </ToolbarButton>
              <ToolbarButton
                title="Delete table"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                {toolbarIcons.deleteTable}
              </ToolbarButton>
            </div>
          </>
        )}
      </div>

      {mixed ? (
        <div className={stageClassName}>
          {overlay}
          {editorContent}
        </div>
      ) : (
        editorContent
      )}

      {urlModal === "link" ? (
        <NotesUrlModal
          key="link-modal"
          open
          onClose={() => setUrlModal(null)}
          onSubmit={handleUrlSubmit}
          title="Insert link"
          subtitle="Add a web address to the selected text."
          submitLabel="Insert link"
        />
      ) : null}
      {urlModal === "image" ? (
        <NotesUrlModal
          key="image-modal"
          open
          onClose={() => setUrlModal(null)}
          onSubmit={handleUrlSubmit}
          title="Insert image"
          subtitle="Paste an image URL. Base64 data URLs also work."
          submitLabel="Insert image"
          inputLabel="Image URL"
          placeholder="https://example.com/image.png"
        />
      ) : null}    </div>
  );
});

export default RichTextEditor;
