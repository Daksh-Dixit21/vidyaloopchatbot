import sys
sys.path.append('/home/saisi/Dev/vidyaloop-chatbot')

from app.services.parser import parse_response

test_response = """
<think>Student asked about velocity. I should give the CBSE definition.</think>

Velocity is the rate of change of displacement with respect to time.

$$\\vec{v} = \\frac{\\Delta x}{\\Delta t}$$

Think about this — if you walk in a circle and return to where you started, what is your displacement?

```mermaid
graph TD;
    A[Start Position] --> B[End Position];
    B --> C{Same as Start?};
    C -- Yes --> D[Displacement = 0];
```
"""

blocks = parse_response(test_response)
for block in blocks:
    print(f"[{block.type.upper()}]")
    print(block.content[:80])
    print()
