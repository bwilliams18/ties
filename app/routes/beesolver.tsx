import { useEffect, useMemo, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { toTitleCase } from "~/util";

// interface Stats {
//   words: number;
//   points: number;
//   pangrams: number;
//   perfectPangrams: number;
//   bingo: boolean;
// }

interface Distribution {
  [key: string]: number[];
}

interface TwoLetterList {
  [combo: string]: number;
}

function parseHintsInput(input: string) {
  const lines = input.trim().split("\n");
  const letters = lines?.[0].split(" ");
  const statsLine = lines?.[2];
  const stats = {
    words: parseInt(statsLine?.match(/WORDS: (\d+)/)?.[1] || "0"),
    points: parseInt(statsLine?.match(/POINTS: (\d+)/)?.[1] || "0"),
    pangrams: parseInt(statsLine?.match(/PANGRAMS: (\d+)/)?.[1] || "0"),
    perfectPangrams: parseInt(
      statsLine?.match(/\((\d+) Perfect\)/)?.[1] || "0"
    ),
    bingo: /BINGO/.test(statsLine),
  };

  const sumLineIndex = lines.findIndex(line => line.includes("Σ:"));
  const distributionHeader = lines[4]
    ?.split(/\s+/)
    ?.slice(0, -1)
    ?.map(dH => parseInt(dH));
  const distributionLines = lines.slice(5, sumLineIndex);
  const distribution = distributionLines.reduce((acc: Distribution, line) => {
    const [letter, ...counts] = line.split(/\s+/);
    acc[letter.replace(":", "")] = counts
      .map(count => (count === "-" ? 0 : parseInt(count)))
      .slice(0, -1);
    return acc;
  }, {});
  // const totals = distribution['Σ'].reduce((acc, val, idx) => {
  //   acc[distributionHeader[idx]] = val;
  //   return acc;
  // }, {});
  // totals.total = parseInt(lines[sumLineIndex].split('\t').pop());

  const twoLetterListLines = lines
    .slice(sumLineIndex + 2)
    .join(" ")
    .split(/\s+/);
  const twoLetterList = twoLetterListLines.reduce(
    (acc: TwoLetterList, item, idx, arr) => {
      if (item.includes("-")) {
        const [combo, count] = item.split("-");
        acc[combo] = parseInt(count);
      } else if (arr[idx + 1] === "-" && arr[idx + 2].match(/^\d+$/)) {
        const combo = item;
        const count = arr[idx + 2];
        acc[combo] = parseInt(count);
      }
      return acc;
    },
    {}
  );

  return {
    letters,
    stats,
    distribution,
    //     : {
    //   ...distribution,
    //   // total: totals
    // },
    twoLetterList,
    distributionHeader,
  };
}

function findTwoLetterWords(
  foundWords: string[],
  twoLetterList: TwoLetterList
) {
  const remainingWords: { [key: string]: number } = Object.entries(
    twoLetterList
  ).reduce((acc, [combo]) => {
    acc[combo] = foundWords.filter(word =>
      word.toUpperCase().startsWith(combo)
    ).length;
    return acc;
  }, {} as TwoLetterList);
  return remainingWords;
}

function analyzeDistribution(
  foundWords: string[],
  distribution: Distribution,
  distributionHeader: number[]
) {
  const foundDistribution = Object.keys(distribution).reduce((acc, letter) => {
    acc[letter] = distribution[letter].map((count, idx) => {
      if (count === 0) return 0;
      const columnHeader = distributionHeader[idx];
      const matchingWords = foundWords.filter(
        word => word.startsWith(letter) && word.length == columnHeader
      );
      return matchingWords.length;
    });
    return acc;
  }, {} as Distribution);

  return foundDistribution;
}

function findPangrams(foundWords: string[], letters: string[]) {
  const letterSet = new Set(letters);
  const pangrams = foundWords.filter(word => {
    const wordSet = new Set(word.split(""));
    return [...letterSet].every(letter => wordSet.has(letter));
  });
  return pangrams;
}

export default function BeeSolver() {
  const [hintsInput, setHintsInput] = useState<string>("");
  const [foundBulkInput, setFoundBulkInput] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [distributionOption, setDistributionOption] =
    useState<string>("remaining");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundWordInput, setFoundWordInput] = useState<string>("");
  useEffect(() => {
    if (!localStorage) return;
    const savedData = localStorage.getItem("beeSolver");
    if (savedData) {
      const { hintsInput, foundWords } = JSON.parse(savedData)?.[date] || {};
      if (hintsInput) {
        setHintsInput(hintsInput);
      }
      if (foundWords) {
        setFoundWords(foundWords);
      }
    }
  }, [date]);
  const { letters, stats, distribution, twoLetterList, distributionHeader } =
    useMemo(() => {
      return parseHintsInput(hintsInput);
    }, [hintsInput]);
  useEffect(() => {
    if (foundBulkInput.endsWith("\n")) {
      const newWords = [
        ...new Set([
          ...foundBulkInput
            .trim()
            .split("\n")
            .map(word => word.trim())
            .filter(word => word),
          ...foundWords,
        ]),
      ].filter(word =>
        word.split("").every(letter => letters.includes(letter.toUpperCase()))
      ); // ensure each letter in each word is in the letters;;
      setFoundWords(newWords);
      if (localStorage) {
        const savedData = localStorage.getItem("beeSolver");
        const data = savedData ? JSON.parse(savedData) : {};
        data[date] = { hintsInput, foundWords: newWords };
        localStorage.setItem("beeSolver", JSON.stringify(data));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundBulkInput]);
  const foundTwoLetters: TwoLetterList = useMemo(
    () => findTwoLetterWords(foundWords, twoLetterList),
    [foundWords, twoLetterList]
  );

  const foundDistribution: Distribution = useMemo(
    () => analyzeDistribution(foundWords, distribution, distributionHeader),
    [foundWords, distribution, distributionHeader]
  );

  const foundPangrams: string[] = useMemo(
    () => findPangrams(foundWords, letters),
    [foundWords, letters]
  );
  return (
    <div className="font-sans container mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-center mb-4">BeeSolver</h1>
      <TabGroup className="m-2">
        <TabList className="flex">
          <Tab className="data-[selected]:bg-yellow-100 bg-gray-200 px-2 py-1 font-bold text-lg rounded-t shadow-inner">
            Bulk Input
          </Tab>
          <Tab className="data-[selected]:bg-yellow-100 bg-gray-200 px-2 py-1 font-bold text-lg rounded-t shadow-inner">
            Hint Helper
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="bg-yellow-100 px-4 py-2 rounded-lg rounded-tl-none">
            <div className="flex flex-col">
              <label
                htmlFor="dateInput"
                className="text-lg font-bold text-center">
                Date
              </label>
              <span className="text-xs text-gray-500 italic">
                {"Enter the date of the puzzle you're solving"}
              </span>
              <input
                value={date}
                type="date"
                id="dateInput"
                className="mb-4 border-2 border-gray-300 p-1 rounded"
                onChange={e => {
                  setDate(e.target.value);
                  setHintsInput("");
                  setFoundBulkInput("");
                }}
              />
              <label
                htmlFor="hintsInput"
                className="text-lg font-bold text-center">
                Hints
              </label>
              <span className="text-xs text-gray-500 italic">
                Copy and Paste the hints from the game here
              </span>
              <textarea
                value={hintsInput}
                id="hintsInput"
                className="h-[40vh] mb-4 border-2 border-gray-300 p-1 rounded"
                onChange={e => setHintsInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="foundBulkInput"
                className="text-lg font-bold text-center">
                Found Words
              </label>
              <span className="text-xs text-gray-500 italic">
                {
                  "Enter the words you've already found, one per line, include an extra newline at the end"
                }
              </span>
              <textarea
                value={foundBulkInput}
                id="foundBulkInput"
                className="h-[40vh] mb-4 border-2 border-gray-300  p-1 rounded"
                onChange={e => setFoundBulkInput(e.target.value)}
              />
            </div>
          </TabPanel>
          <TabPanel className="flex flex-col gap-1 bg-yellow-100 px-4 py-2 rounded-lg rounded-tl-none">
            <h2 className="text-2xl font-bold text-center">Hint Helper</h2>
            <span className="text-xs text-gray-500 italic text-center">
              All info formatted goal-found=remaining
            </span>
            <div className="bg-white rounded p-2">
              <div className="flex gap-1 flex-wrap">
                <b>Found Words:</b>
                {foundWords.map(word => (
                  <span
                    key={word}
                    className="border-1 border-gray-300 rounded bg-yellow-400 px-1 inline-block">
                    {word}
                  </span>
                ))}
              </div>
              <div className="flex mt-2">
                <input
                  title="Enter a word you've found"
                  placeholder="Enter a word you've found"
                  type="text"
                  className="border-1 border-gray-400 p-1 mr-2 grow bg-gray-200"
                  value={foundWordInput}
                  onChange={e => setFoundWordInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      setFoundWords([...foundWords, foundWordInput]);
                      if (localStorage) {
                        const savedData = localStorage.getItem("beeSolver");
                        const data = savedData ? JSON.parse(savedData) : {};
                        data[date] = {
                          hintsInput,
                          foundWords: [...foundWords, foundWordInput],
                        };
                        localStorage.setItem("beeSolver", JSON.stringify(data));
                      }
                      setFoundWordInput("");
                    }
                  }}
                />
                <button
                  className="bg-yellow-400 text-white rounded px-2 py-1"
                  onClick={() => {
                    setFoundWords([...foundWords, foundWordInput]);
                    if (localStorage) {
                      const savedData = localStorage.getItem("beeSolver");
                      const data = savedData ? JSON.parse(savedData) : {};
                      data[date] = {
                        hintsInput,
                        foundWords: [...foundWords, foundWordInput],
                      };
                      localStorage.setItem("beeSolver", JSON.stringify(data));
                    }
                    setFoundWordInput("");
                  }}>
                  Add Word
                </button>
              </div>
            </div>
            <div className="flex gap-1 bg-white rounded p-2 w-fit">
              <div
                className="data-[solved=true]:line-through data-[solved=true]:text-gray-400"
                data-solved={stats.words - foundWords.length === 0}>
                <b>Words:</b> {stats.words}-{foundWords.length}=
                {stats.words - foundWords.length}
              </div>
              {stats.pangrams > 0 && (
                <div
                  className="data-[solved=true]:line-through data-[solved=true]:text-gray-400"
                  data-solved={
                    stats.pangrams - foundPangrams.length === 0 &&
                    stats.pangrams > 0
                  }>
                  <b>Pangrams:</b> {stats.pangrams}-{foundPangrams.length}=
                  {stats.pangrams - foundPangrams.length}
                </div>
              )}
            </div>
            <div className="bg-white rounded p-2 overflow-x-auto">
              <b>Distribution</b>
              <div className="flex mb-1">
                {["goal", "found", "remaining"].map(option => (
                  <button
                    key={option}
                    className="data-[selected=true]:bg-yellow-400 data-[selected=true]:text-white bg-yellow-100 px-2 py-1 text-xs rounded mr-1"
                    data-selected={distributionOption === option}
                    onClick={() => setDistributionOption(option)}>
                    {toTitleCase(option)}
                  </button>
                ))}
              </div>
              <table className="table-auto border">
                <thead>
                  <th className="text-right border border-gray-500 pr-1"></th>
                  {distributionHeader?.map((header, idx) => (
                    <th
                      key={idx}
                      className="text-center border border-gray-500">
                      {header}
                    </th>
                  ))}
                </thead>
                <tbody>
                  {Object.entries(distribution).map(([letter, counts]) => (
                    <tr key={letter}>
                      <td className="text-right  border border-gray-500 pr-1">
                        {letter}
                      </td>
                      {counts.map((count, idx) => (
                        <td
                          className="text-center w-[3ch] text-nowrap data-[solved=true]:line-through data-[solved=true]:text-gray-400 border border-gray-500 px-1"
                          data-solved={
                            count - (foundDistribution[letter]?.[idx] || 0) ===
                              0 && count > 0
                          }
                          key={idx}>
                          {["goal", "combined"].includes(distributionOption) &&
                          count
                            ? count === 0
                              ? "-"
                              : count
                            : ""}
                          {["found", "combined"].includes(distributionOption) &&
                          count
                            ? foundDistribution[letter]?.[idx]
                            : ""}
                          {["remaining", "combined"].includes(
                            distributionOption
                          ) && count
                            ? count - foundDistribution[letter]?.[idx]
                            : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded p-2 w-fit">
              <b>Two Letter Words</b>
              {Object.entries(twoLetterList).map(([combo, count]) => (
                <div
                  key={combo}
                  className="mr-1 data-[solved=true]:line-through data-[solved=true]:text-gray-400"
                  data-solved={
                    count - foundTwoLetters[combo] === 0 && count > 0
                  }>
                  <b>{combo}:</b> {count}-{foundTwoLetters[combo]}=
                  {count - foundTwoLetters[combo]}
                </div>
              ))}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
