function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5">
      <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce-dot animate-bounce-dot-delay-1" />
      <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce-dot animate-bounce-dot-delay-2" />
      <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce-dot animate-bounce-dot-delay-3" />
    </div>
  )
}

export default TypingIndicator
