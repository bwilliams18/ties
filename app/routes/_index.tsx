import type { MetaFunction } from "@remix-run/node";
import { useEffect, useRef, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const categoryColors = [
  "bg-yellow-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-purple-200",
];

// square emoji
const categoryEmoji = ["🟨", "🟩", "🟦", "🟪"];

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SortableItem({ item, handleClick, isSelected }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const [dragTime, setDragTime] = useState(0);
  //height equal to width
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // display: 'flex',
    // justifyContent: 'center',
    // alignItems: 'center',
    // border: isSelected ? '4px solid black' : '2px solid gray',
    // cursor: 'grab',
    // fontSize: 'clamp(1rem, 2rem)',
    // textAlign: 'center',
    // hyphens: "auto",
    wordBreak: "break-word",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex aspect-1 justify-center align-center rounded hyphen-auto bg-white border text-pretty select-none ${
        isSelected ? "border-4 border-pink-400" : "border-gray-300"
      } ${
        isDragging
          ? "opacity-50 cursor-grabbing drop-shadow-lg"
          : "cursor-grab drop-shadow"
      }`}>
      <div
        className="w-full h-full items-center justify-center flex font-bold text-center"
        onMouseDown={e => {
          // store current time
          setDragTime(new Date().getTime());
        }}
        onMouseUp={e => {
          // if in last 100ms, it was a click
          if (new Date().getTime() - dragTime < 100) {
            handleClick(item.id);
          }
        }}>
        {toTitleCase(item.content)}
      </div>
    </div>
  );
}

export default function Index() {
  // get the date from query params
  useEffect(() => {
    if (!window) return;
    const urlParams = new URLSearchParams(window.location.search);
    const rNumber = parseInt(urlParams?.get("number")) || null;
    const rDate = rNumber
      ? new Date("2023-06-12").getTime() + (rNumber - 1) * 1000 * 60 * 60 * 24
      : urlParams?.get("date") || new Date().toISOString().split("T")[0];
    setDate(new Date(rDate).toISOString().split("T")[0]);
  }, []);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const puzzleNumber =
    Math.floor(
      (new Date(date).getTime() - new Date("2023-06-12").getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  const [puzzle, setPuzzle] = useState({});
  const [selectedCards, setSelectedCards] = useState([]);
  const [cards, setCards] = useState([]);
  const [solvedCategories, setSolvedCategories] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [hints, setHints] = useState(0);
  useEffect(() => {
    if (!localStorage) return;
    const savedCategories =
      JSON.parse(localStorage.getItem("solvedCategories")) || {};
    console.log(savedCategories, date, savedCategories[date]);
    setSolvedCategories(
      (JSON.parse(localStorage.getItem("solvedCategories")) || {})?.[date] || []
    );
    setGuesses(
      (JSON.parse(localStorage.getItem("guesses")) || {})?.[date] || []
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
        ?.map((category, idx) =>
          category.cards.map(card => ({
            ...card,
            id: card.position,
            category: category.title,
            categoryLevel: idx,
          }))
        )
        ?.flat()
        ?.sort((a, b) => a.position - b.position);
      setCards(cards);
      setSolvedCategories([]);
      setGuesses([]);
      setHints(0);
    });
  }, [date]);

  // flatten the cards array
  // sort cards by position
  const handleDragEnd = event => {
    const { active, over } = event;

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
    <div className="font-sans p-4 container mx-auto">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Connections</h1>
        <h2 className="text-xl font-bold">
          #{puzzleNumber} by {puzzle?.editor}
        </h2>
        <div className="text-xl">
          <label htmlFor="date" className="font-bold">
            From:{" "}
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
      </div>
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
                      <span className="mx-1 text-lg">
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
                        selectedCards?.filter(selectedId => selectedId !== id)
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
                  ...(JSON.parse(localStorage.getItem("guesses")) || {}),
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
            }, {});
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
                    ...(JSON.parse(localStorage.getItem("solvedCategories")) ||
                      {}),
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
                .map((guess, idx) =>
                  guess.map(card => categoryEmoji[card.categoryLevel]).join("")
                )
                .join("\n"),
              // remove any query params from the url
              window.location.href.split("?")[0] + `?number=${puzzleNumber}`,
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
    </div>
  );
}
