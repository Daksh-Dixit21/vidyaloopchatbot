import re
import json
from dataclasses import dataclass
from typing import Literal


@dataclass
class ResponseBlock:
    """
    A single parsed chunk of the model's response.
    
    The model returns one big string. We split it into typed blocks.
    The frontend uses the 'type' field to decide how to render each block.
    
    Types:
    - text     → render as plain text/markdown
    - latex    → render with KaTeX
    - mermaid  → render with Mermaid.js
    - flashcard → render as interactive flip card
    """
    type: Literal["text", "latex", "mermaid", "flashcard"]
    content: str

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "content": self.content
        }


def parse_response(raw_text: str) -> list[ResponseBlock]:
    """
    Parses a raw LLM response string into a list of typed blocks.

    Handles:
    - $$...$$ → latex block (display math)
    - ```mermaid...``` → mermaid diagram
    - ```json {"type": "flashcard"...}``` → interactive flashcard
    - Everything else → plain text

    Why regex split?
    We use re.split() with a capturing group.
    This splits the text AT the delimiters while KEEPING the delimiters
    in the result list. So we can classify each chunk.

    Example:
    "Hello $$F=ma$$ world" 
    → ["Hello ", "$$F=ma$$", " world"]
    → [text, latex, text]
    """
    blocks = []

    # First strip <think> tags — model's internal reasoning, never show to student
    raw_text = re.sub(r'<think>[\s\S]*?</think>', '', raw_text).strip()

    # Pattern matches our three special block types
    # The outer () is a capturing group — keeps the match in the split result
    pattern = r'(```mermaid[\s\S]*?```|```json[\s\S]*?```|\$\$[\s\S]*?\$\$)'
    parts = re.split(pattern, raw_text)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        if part.startswith('```mermaid') and part.endswith('```'):
            # Strip the ```mermaid and ``` markers, keep only the diagram code
            mermaid_code = part[10:-3].strip()
            blocks.append(ResponseBlock(type="mermaid", content=mermaid_code))

        elif part.startswith('```json') and part.endswith('```'):
            json_str = part[7:-3].strip()
            try:
                data = json.loads(json_str)
                if data.get("type") == "flashcard":
                    blocks.append(ResponseBlock(type="flashcard", content=json_str))
                else:
                    blocks.append(ResponseBlock(type="text", content=part))
            except json.JSONDecodeError:
                blocks.append(ResponseBlock(type="text", content=part))

        elif part.startswith('$$') and part.endswith('$$'):
            latex = part[2:-2].strip()
            blocks.append(ResponseBlock(type="latex", content=latex))

        else:
            blocks.append(ResponseBlock(type="text", content=part))

    return blocks