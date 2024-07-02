import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useEffect, useState } from "react";
import { toTitleCase } from "~/util";

const categoryColors = [
  "bg-yellow-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-purple-200",
];

// square emoji
const categoryEmoji = ["🟨", "🟩", "🟦", "🟪"];

interface Card {
  content: string;
  position: number;
}

interface Item extends Card {
  id: number;
  category: string;
  categoryLevel: number;
}

interface SortableItemProps {
  item: Item;
  handleClick: (id: number) => void;
  isSelected: boolean;
}

interface Puzzle {
  editor?: string;
  categories?: Array<{
    title: string;
    cards: Array<Item>;
  }>;
}

interface Category {
  title: string;
  cards: Array<Item>;
  level: number;
}

function SortableItem({ item, handleClick, isSelected }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition = "",
    isDragging,
  } = useSortable({ id: item.id });
  const [dragTime, setDragTime] = useState(0);
  //height equal to width
  useEffect(() => {
    const handleTouchMove = event => {
      if (event.touches.length > 1) {
        return; // Allow default behavior if there's more than one touch point
      }
      event.preventDefault(); // Prevent scrolling
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform) || "",
        transition: transition || "",
        wordBreak: "break-word",
        // display: 'flex',
        // justifyContent: 'center',
        // alignItems: 'center',
        // border: isSelected ? '4px solid black' : '2px solid gray',
        // cursor: 'grab',
        // fontSize: 'clamp(1rem, 2rem)',
        // textAlign: 'center',
        // hyphens: "auto",
      }}
      {...attributes}
      {...listeners}
      className={`flex aspect-1 justify-center align-center rounded hyphen-auto bg-white border text-pretty select-none ${
        isSelected ? "border-4 border-pink-400" : "border-gray-300"
      } ${
        isDragging
          ? "opacity-50 cursor-grabbing drop-shadow-lg"
          : "cursor-grab drop-shadow"
      }`}>
      <button
        className="w-full h-full items-center justify-center flex font-bold text-center"
        onMouseDown={() => {
          // store current time
          setDragTime(new Date().getTime());
        }}
        onMouseUp={() => {
          // if in last 100ms, it was a click
          if (new Date().getTime() - dragTime < 100) {
            handleClick(item.id);
          }
        }}>
        {toTitleCase(item.content)}
      </button>
    </div>
  );
}

export default function Connections() {
  // get the date from query params
  useEffect(() => {
    if (!window) return;
    const urlParams = new URLSearchParams(window.location.search);
    const rNumber = parseInt(urlParams?.get("number") || "");
    const rDate = rNumber
      ? new Date("2023-06-12").getTime() + (rNumber - 1) * 1000 * 60 * 60 * 24
      : urlParams?.get("date") || new Date().toISOString().split("T")[0];
    setDate(new Date(rDate).toISOString().split("T")[0]);
  }, []);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [puzzle, setPuzzle] = useState<Puzzle>({});
  const [selectedCards, setSelectedCards] = useState<Array<number>>([]);
  const [cards, setCards] = useState<Array<Item>>([]);
  const [solvedCategories, setSolvedCategories] = useState<Array<Category>>([]);
  const [guesses, setGuesses] = useState<Array<Array<Item>>>([]);
  const [hints, setHints] = useState<number>(0);
  const puzzleNumber =
    Math.floor(
      (new Date(date).getTime() - new Date("2023-06-12").getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  useEffect(() => {
    if (!localStorage) return;
    const savedCategories = JSON.parse(
      localStorage?.getItem("solvedCategories") || "{}"
    );
    console.log(savedCategories, date, savedCategories[date]);
    setSolvedCategories(
      JSON.parse(localStorage?.getItem("solvedCategories") || "{}")?.[date] ||
        []
    );
    setGuesses(
      JSON.parse(localStorage?.getItem("guesses") || "{}")?.[date] || []
    );
  }, [date]);
  useEffect(() => {
    // check if development or production
    fetch(
      ("http://localhost:5173" === window.location.origin
        ? "http://localhost:2120"
        : "") + `/puzzle/${date}.json`
    ).then(async response => {
      const data = await response.json();
      setPuzzle(data);
      const cards = data.categories
        ?.map((category: { cards: Card[]; title: string }, idx: number) =>
          category.cards.map(card => ({
            ...card,
            id: card.position,
            category: category.title,
            categoryLevel: idx,
          }))
        )
        ?.flat()
        ?.sort(
          (a: { position: number }, b: { position: number }) =>
            a.position - b.position
        );
      setCards(cards);
      setSolvedCategories([]);
      setGuesses([]);
      setHints(0);
    });
  }, [date]);

  // flatten the cards array
  // sort cards by position
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setCards(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const activeCards = cards?.filter(
    card =>
      !solvedCategories.some(category =>
        category.cards.map(card => card.id).includes(card.id)
      )
  );
  const numberIncorrect = guesses.length - solvedCategories.length;
  // days between 2023-06-12 and selected date
  return (
    <div className="font-sans container mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-center mb-4">Connections</h1>
      <TabGroup className="m-2">
        {/* <TabList className="flex">
          <Tab className="data-[selected]:bg-purple-200 bg-gray-200 px-2 py-1 font-bold text-lg rounded-t shadow-inner">
            Play
          </Tab>
          <Tab className="data-[selected]:bg-purple-200 bg-gray-200 px-2 py-1 font-bold text-lg rounded-t shadow-inner">
            Archive
          </Tab>
        </TabList> */}
        <TabPanels>
          <TabPanel className="bg-purple-200 px-4 py-2 rounded-lg rounded-tl-none">
            {" "}
            <h2 className="text-xl font-bold">
              #{puzzleNumber} by {puzzle?.editor}
            </h2>
            <div className="text-xl">
              <label htmlFor="date" className="font-bold">
                Date:{" "}
              </label>
              <input
                title="date"
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  setHints(0);
                  setSolvedCategories([]);
                  setGuesses([]);
                }}
                min="2023-06-12"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <h2 className="text-xl font-bold">
              Number Incorrect: {guesses.length - solvedCategories.length}
            </h2>
            {cards.length > 0 ? (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                // modifiers={[sortableKeyboardCoordinates]}
              >
                <SortableContext items={activeCards.map(item => item.id)}>
                  <div className="grid grid-cols-4 gap-2 max-h-[80vh] aspect-1 p-2 bg-gray-200 rounded">
                    {solvedCategories.map((category, idx) => (
                      <div
                        key={idx}
                        className={`rounded p-2 aspect-4 col-span-4 justify-center items-center flex flex-col ${
                          categoryColors[category.level]
                        }`}>
                        <h2 className="text-xl font-bold">
                          {toTitleCase(category.title)}
                        </h2>
                        <div>
                          {category.cards.map(card => (
                            <span key={card.id} className="mx-1 text-lg">
                              {toTitleCase(card.content)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {activeCards.map(item => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        isSelected={selectedCards.includes(item.id)}
                        handleClick={id => {
                          if (selectedCards.includes(id)) {
                            setSelectedCards(
                              selectedCards?.filter(
                                selectedId => selectedId !== id
                              )
                            );
                          } else if (selectedCards.length < 4) {
                            setSelectedCards([...selectedCards, id]);
                          }
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : null}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded grow disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedCards.length < 4}
                onClick={() => {
                  const actualCards = cards.filter(card =>
                    selectedCards.includes(card.id)
                  );
                  const newGuesses = [...guesses, actualCards];
                  setGuesses(newGuesses);
                  if (localStorage) {
                    localStorage.setItem(
                      "guesses",
                      JSON.stringify({
                        ...JSON.parse(localStorage?.getItem("guesses") || "{}"),
                        [date]: newGuesses,
                      })
                    );
                  }
                  const actualCategories = actualCards.reduce((acc, card) => {
                    if (acc[card.category]) {
                      acc[card.category].push(card);
                    } else {
                      acc[card.category] = [card];
                    }
                    return acc;
                  }, {} as { [key: string]: Array<Item> });
                  const solved = Object.keys(actualCategories).length === 1;
                  if (solved) {
                    const newCategories = [
                      ...solvedCategories,
                      {
                        cards: actualCards,
                        title: Object.keys(actualCategories)[0],
                        level: actualCards[0].categoryLevel,
                      },
                    ];
                    setSolvedCategories(newCategories);
                    if (localStorage) {
                      localStorage.setItem(
                        "solvedCategories",
                        JSON.stringify({
                          ...JSON.parse(
                            localStorage?.getItem("solvedCategories") || "{}"
                          ),
                          [date]: newCategories,
                        })
                      );
                    }
                  }
                  setSelectedCards([]);
                }}>
                Submit
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded grow disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedCards.length === 0}
                onClick={() => {
                  setSelectedCards([]);
                }}>
                Clear
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded grow disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={solvedCategories.length < 4}
                onClick={() => {
                  const text = [
                    "Connections",
                    `#${puzzleNumber} by ${puzzle.editor}`,
                    guesses
                      .map(guess =>
                        guess
                          .map(card => categoryEmoji[card.categoryLevel])
                          .join("")
                      )
                      .join("\n"),
                    // remove any query params from the url
                    window.location.href.split("?")[0] +
                      `?number=${puzzleNumber}`,
                  ].join("\n");
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                  } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed"; // Avoid scrolling to bottom of page in MS Edge.
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      const successful = document.execCommand("copy");
                      alert(
                        successful
                          ? "Copied to clipboard!"
                          : "Failed to copy to clipboard"
                      );
                    } catch (err) {
                      console.error("Fallback: Oops, unable to copy", err);
                    }
                  }
                }}>
                Share
              </button>
              <button
                onClick={() => {
                  setSolvedCategories([]);
                  setGuesses([]);
                }}
                disabled={solvedCategories.length < 4}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded grow disabled:opacity-50 disabled:cursor-not-allowed
          ">
                Reset
              </button>
              {numberIncorrect > 4 && (
                <div className="flex flex-col grow col-span-2">
                  <div className="flex flex-col gap-2 mb-2">
                    {puzzle?.categories
                      ?.map((category, idx) => ({ ...category, level: idx }))
                      ?.filter(
                        category =>
                          !solvedCategories
                            .map(category => category.title)
                            .some(title => category.title === title)
                      )
                      ?.slice(0, hints)
                      .map(category => (
                        <div
                          key={category.title}
                          className={`rounded p-2 justify-center items-center flex flex-col ${
                            categoryColors[category.level]
                          }`}>
                          <h2 className="text-xl font-bold">
                            {toTitleCase(category.title)}
                          </h2>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={() => {
                      setHints(hints => hints + 1);
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded grow disabled:opacity-50 disabled:cursor-not-allowed">
                    Get Hint
                  </button>
                </div>
              )}
            </div>
          </TabPanel>
          {/* <TabPanel className="bg-purple-200 px-4 py-2 rounded-lg rounded-tl-none">
            <h2 className="text-xl font-bold">Archive</h2>
          </TabPanel> */}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
