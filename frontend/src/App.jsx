import { useState, useRef, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'

function App() {
  return (
    <div className="h-screen flex flex-col">
      <ChatWindow />
    </div>
  )
}

export default App