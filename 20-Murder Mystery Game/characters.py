"""Everyone in the murder mystery.

Each person in the story is a Character. Add new people to the lists at the
bottom of this file and they show up in the game automatically.
"""


class Character:
    def __init__(self, name, role, description, facts=None, quotes=None):
        self.name = name
        self.role = role
        self.description = description
        # Clues the detective writes down in the notebook
        self.facts = facts or []
        # Things people say, as (who said it, what they said)
        self.quotes = quotes or []

    def __str__(self):
        return f"{self.name} - {self.role}"


# The person who was killed
VICTIM = Character(
    name="Kevin",
    role="Businessman (the victim)",
    description=(
        "Kevin was a businessman at the very top of everyone. In his mind, "
        "being on top meant everyone had to love him. That's how he thought "
        "the world worked."
    ),
    facts=[
        "Kevin had a crazy amount of power over the people who worked for him.",
        "The people who worked for Kevin called him a dictator.",
        "Kevin fired a man for wearing a red that was only slightly too bright.",
        "Kevin yelled at that man about being professional and said he "
        "messed it up by sticking out.",
        "Workers say not even someone with the best eyes could tell the "
        "difference in the red.",
    ],
    quotes=[
        ("A worker", "He wasn't a boss. He was a dictator."),
        ("Another worker", "Nobody, not even someone with perfect eyes, "
                           "could have told that red was any different."),
    ],
)

# The 2 main side characters who help the detective through the case
HELPERS = []

# Everyone else in the story (about 25 more people)
SUSPECTS = []

# Set this to the killer's name once the story decides who did it
KILLER_NAME = None
