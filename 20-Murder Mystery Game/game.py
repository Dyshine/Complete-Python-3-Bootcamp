"""Who Killed Kevin? A murder mystery where you are the detective.

Run it from this folder with:  python game.py
"""

from characters import VICTIM, HELPERS, SUSPECTS, KILLER_NAME


def line():
    print("-" * 60)


def show_intro():
    print("=" * 60)
    print("                    WHO KILLED KEVIN?")
    print("=" * 60)
    print("You are the detective. Kevin, the most powerful man in the")
    print("company, has been killed. Everyone had to love him... but")
    print("did anyone actually love him?")
    print()


def write_down(notebook, facts):
    for fact in facts:
        if fact not in notebook:
            notebook.append(fact)


def show_person(person):
    line()
    print(person)
    print()
    print(person.description)
    if person.quotes:
        print()
        for speaker, words in person.quotes:
            print(f'  {speaker}: "{words}"')
    line()


def read_case_file(notebook):
    print("\nCASE FILE: THE VICTIM")
    show_person(VICTIM)
    print("What you know about him:")
    for fact in VICTIM.facts:
        print(f"  * {fact}")
    write_down(notebook, VICTIM.facts)
    print("\n(You copy this into your notebook.)")


def pick_person(people):
    """Show a numbered list and return the chosen person, or None."""
    for number, person in enumerate(people, start=1):
        print(f"  {number}. {person}")
    choice = input("Pick a number (or press Enter to go back): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(people):
        return people[int(choice) - 1]
    return None


def talk_to(people, empty_message, notebook):
    if not people:
        print(f"\n{empty_message}")
        return
    print()
    person = pick_person(people)
    if person:
        show_person(person)
        write_down(notebook, person.facts)


def show_notebook(notebook):
    print("\nYOUR NOTEBOOK")
    line()
    if not notebook:
        print("Nothing written down yet.")
    for number, fact in enumerate(notebook, start=1):
        print(f"{number}. {fact}")
    line()


def accuse():
    """Return True if the case is over."""
    if not SUSPECTS:
        print("\nThere is nobody to accuse yet.")
        return False
    print("\nWho killed Kevin?")
    person = pick_person(SUSPECTS)
    if person is None:
        return False
    if KILLER_NAME is None:
        print("\nThe story isn't finished yet. The killer hasn't been picked!")
        return False
    if person.name == KILLER_NAME:
        print(f"\nYou got it! {person.name} killed Kevin. Case closed.")
    else:
        print(f"\nWrong! {person.name} didn't do it, and the killer got away.")
    return True


def main():
    notebook = []
    show_intro()
    while True:
        print("\nWhat do you want to do?")
        print("  1. Read the case file on Kevin")
        print("  2. Talk to your partners")
        print("  3. Interview someone")
        print("  4. Check your notebook")
        print("  5. Make an accusation")
        print("  6. Quit")
        choice = input("> ").strip()

        if choice == "1":
            read_case_file(notebook)
        elif choice == "2":
            talk_to(HELPERS, "Your partners haven't arrived yet.", notebook)
        elif choice == "3":
            talk_to(SUSPECTS, "There's nobody here to interview yet.", notebook)
        elif choice == "4":
            show_notebook(notebook)
        elif choice == "5":
            if accuse():
                break
        elif choice == "6":
            print("\nThe case goes cold... for now.")
            break
        else:
            print("Please type a number from 1 to 6.")


if __name__ == "__main__":
    main()
