import type { ChatMessage } from "../../hooks/useAssistantChat";

type ChatMessageBubbleProps = {
  message: ChatMessage;
};

const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const classes =
    message.author === "user"
      ? "bg-primary text-white self-end rounded-2xl rounded-br-none px-3 py-2 text-sm shadow"
      : message.author === "assistant"
        ? "bg-slate-100 text-slate-900 self-start rounded-2xl rounded-bl-none px-3 py-2 text-sm shadow"
        : "bg-slate-200 text-slate-800 self-center rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600";

  return (
    <div className={`flex w-full ${message.author === "user" ? "justify-end" : "justify-start"}`}>
      <div className={classes}>{message.text}</div>
    </div>
  );
};

export default ChatMessageBubble;
