from dataclasses import dataclass, field
from typing import Literal


@dataclass
class StudentProfile:
    name: str = "Student"
    class_level: int = 11
    learner_type: Literal["text", "visual", "math", "interactive"] = "text"
    math_depth: Literal["surface", "deep"] = "surface"
    frustration_level: float = 0.1

    # Hint tracking — lives in Python, NOT in the model
    current_concept: str = ""
    hint_count: int = 0
    MAX_HINTS: int = 5

    def new_concept(self, concept: str):
        """Call this when student asks a new question."""
        self.current_concept = concept
        self.hint_count = 0

    def increment_hint(self):
        """Call this after every model response."""
        self.hint_count += 1

    def should_reveal(self) -> bool:
        """Returns True when model must give the answer."""
        return self.hint_count >= self.MAX_HINTS

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "class_level": self.class_level,
            "learner_type": self.learner_type,
            "math_depth": self.math_depth,
            "frustration_level": self.frustration_level,
            "current_concept": self.current_concept,
            "hint_count": self.hint_count
        }