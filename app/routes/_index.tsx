import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Ties" },
    { name: "description", content: "A Better Connections" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export default function Index() {
  const navigate = useNavigate();
  // if parameters includes number redirect to /connections with the number
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const number = urlParams.get("number");
      if (number) {
        navigate(`/connections?number=${number}`);
      }
    }
  });
  return (
    <div className="font-sans container mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-center text-blue-500">
        Welcome to Ties
      </h1>
      <div className="flex gap-1 items-center justify-center">
        <a
          className="bg-yellow-400 text-white px-2 py-1 rounded-md hover:bg-yellow-600 text-xl aspect-1 justify-center text-pretty items-center flex h-40 text-center"
          href="/beesolver">
          Bee Solver
        </a>
        <a
          className="bg-purple-600 text-white px-2 py-1 rounded-md hover:bg-purple-800 text-xl aspect-1 justify-center text-pretty items-center flex h-40 text-center"
          href="/connections">
          Connections
        </a>
      </div>
    </div>
  );
}
