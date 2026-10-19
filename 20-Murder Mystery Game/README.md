# Who Killed Kevin?

A text murder mystery game. You are the detective, two main side characters
help you through the case, and about 28 people make up the story.

## How to play

```
cd "20-Murder Mystery Game"
python game.py
```

## Characters so far

| # | Name  | Who they are                                   |
|---|-------|------------------------------------------------|
| 1 | Kevin | The victim. A businessman people called a dictator. |

Still to come: the 2 side characters who help the detective, and everyone else.

## Adding a character

Open `characters.py` and add a `Character` to `HELPERS` (the two partners)
or `SUSPECTS` (everyone else):

```python
SUSPECTS = [
    Character(
        name="Name",
        role="What they do",
        description="What they are like.",
        facts=["A clue the detective writes down."],
        quotes=[("Name", "Something they say when you talk to them.")],
    ),
]
```

When the story decides who did it, set `KILLER_NAME` to that person's name.
