# Knockout Alley

A 2D side-scrolling street-boxing brawler drawn in a 16-bit, Streets of Rage-inspired style. It is one HTML file with no dependencies: open `index.html` in a browser to play.

Fight through three stages (Downtown, The Docks, Fight Club). Each stage ends with a boss fight.

## Fighters

Pick your fighter after pressing Start:

| Fighter | Style | Power | HP | Speed |
| --- | --- | --- | --- | --- |
| Goldie Brooks | "Solid Gold": afro, gold robe, orange satin trunks | ★★★★ | ★★★★ | ★★★★ |
| Jack Johnson | "The Galveston Giant", heavyweight champion 1908–1915 | ★★★★★ | ★★★★ | ★★★ |

Jack Johnson is drawn in his era's style: shaved head, gold-toothed grin, long white trunks with a stars-and-stripes sash, leather gloves and high boots.

![Goldie Brooks sprite sheet](goldie-brooks-sprites.png)

![Jack Johnson sprite sheet](jack-johnson-sprites.png)

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move (left, right, up and down the street) | Arrow keys (or WASD) | D-pad |
| Body punch | C | BDY |
| Block | V | BLK |
| Duck | Shift (hold) | DCK |
| Jab | Z (or J) | JAB |
| Uppercut | X (or K) | UPP |
| Star punch | Space (or L) | ★ |
| Start | Enter | START |
| Pause | P / Esc | — |
| Sound on/off | M | SOUND |

## Breakables and the gym

Crates, barrels and trash cans line every stage. Each one takes a random number of punches to break, and drops cash, food, or both. Walk over loot to pick it up: food restores health, and cash is spent at the gym between stages.

| Upgrade | Effect | Levels |
| --- | --- | --- |
| Power | Punches hit 15% harder | 5 |
| Stamina | Max HP +20 | 5 |
| Footwork | Move 12% faster | 3 |
| Iron Chin | Take 10% less damage | 4 |
| Star Start | Start each stage with +1 star | 3 |
| Ice Bath | Refill HP to full | any time |

## Tips

- **Duck** under jabs and uppercuts. A punch that whiffs over you is a **slip**, and your next punch counts as a counter. Ducking doesn't stop body punches, and enemies throw more of them when you duck.
- **Body punches** go straight through an opponent's block and make them hesitate before their next attack.

- Punches only land on fighters at the same depth, so line up with your opponent or step up and down out of the way.

- Opponents flash their gloves before they punch. A yellow `!` over their head means an uppercut is coming.
- Hit an opponent while they're winding up for a **counter**: 1.5x damage and a star.
- Every 5 hits in a row without taking a hit also earns a star (you can hold up to 3).
- The star punch costs one star. It knocks the opponent down and breaks through their block.
- Blocking only works against punches from the side you're facing.
