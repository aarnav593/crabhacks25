import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { useWallet } from '@solana/wallet-adapter-react';
import { BookOpen, Code, Coins, Trophy, ArrowRight, RefreshCw, XCircle } from 'lucide-react';

// Dynamically import Wallet Button to prevent hydration errors
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

// --- Data: Quiz Topics (Solana, Math, Crabs) ---
type Question = { id: number; text: string; options: string[]; correct: string };
type Topic = { id: string; title: string; icon: any; description: string; questions: Question[] };

const TOPICS: Topic[] = [
  {
    id: 'solana-basics',
    title: 'Solana Basics',
    icon: Coins, 
    description: 'Test your knowledge on PoH, Accounts, and Consensus.',
    questions: [
      { id: 1, text: "Which mechanism allows Solana to timestamp transactions?", options: ["Proof of Work", "Proof of History", "Proof of Stake", "Sharding"], correct: "Proof of History" },
      { id: 2, text: "What is the native token used for gas fees?", options: ["ETH", "SOL", "USDC", "BTC"], correct: "SOL" },
      { id: 3, text: "What is the approximate block time on Solana?", options: ["10 minutes", "12 seconds", "400 milliseconds", "1 hour"], correct: "400 milliseconds" },
      { id: 4, text: "What language is primarily used for Solana programs?", options: ["Solidity", "Rust", "Python", "Java"], correct: "Rust" },
      { id: 5, text: "Who signs a transaction to authorize transfer?", options: ["Validator", "Miner", "Wallet Owner", "RPC Node"], correct: "Wallet Owner" }
    ]
  },
  {
    id: 'math-basics',
    title: 'Math Basics',
    icon: Code, 
    description: 'Arithmetic, geometry, and simple number logic.',
    questions: [
      { id: 1, text: "What is the square root of 81?", options: ["7", "8", "9", "10"], correct: "9" },
      { id: 2, text: "What is the value of Pi (approx)?", options: ["3.14", "2.14", "4.13", "3.41"], correct: "3.14" },
      { id: 3, text: "If 5x = 20, what is x?", options: ["2", "4", "5", "10"], correct: "4" },
      { id: 4, text: "What is 15% of 200?", options: ["20", "25", "30", "35"], correct: "30" },
      { id: 5, text: "Which of these is a prime number?", options: ["4", "9", "11", "15"], correct: "11" }
    ]
  },
  {
    id: 'crab-bio',
    title: 'Biology of Crabs',
    icon: BookOpen,
    description: 'Molting, exoskeletons, and crustacean anatomy.',
    questions: [
      { id: 1, text: "What substance makes a crab's shell hard?", options: ["Bone", "Keratin", "Chitin", "Calcium"], correct: "Chitin" },
      { id: 2, text: "How many legs does a decapod crab have?", options: ["6", "8", "10", "12"], correct: "10" },
      { id: 3, text: "What is the process called when a crab sheds its shell?", options: ["Shedding", "Molting", "Evolving", "Peeling"], correct: "Molting" },
      { id: 4, text: "True or False: Crabs have a backbone.", options: ["True", "False"], correct: "False" },
      { id: 5, text: "What is a group of crabs called?", options: ["A school", "A herd", "A cast", "A flock"], correct: "A cast" }
    ]
  }
];

export default function Home() {
  const { publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);

  // Game State
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'topic-select' | 'quiz' | 'minting' | 'success' | 'fail'>('topic-select');

  useEffect(() => setIsMounted(true), []);

  const activeTopic = useMemo(() => TOPICS.find(t => t.id === activeTopicId), [activeTopicId]);

  // --- Actions ---

  const selectTopic = (id: string) => {
    setActiveTopicId(id);
    setGameState('quiz');
    setCurrentQIndex(0);
    setScore(0);
  };

  const handleAnswer = (option: string) => {
    if (!activeTopic) return;
    
    const isCorrect = option === activeTopic.questions[currentQIndex].correct;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    if (currentQIndex < activeTopic.questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      finishQuiz(newScore);
    }
  };

  const finishQuiz = (finalScore: number) => {
    if (!activeTopic) return;
    const percentage = (finalScore / activeTopic.questions.length) * 100;
    
    if (percentage >= 70) {
      setGameState('success');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setGameState('fail');
    }
  };

  const resetGame = () => {
    setGameState('topic-select');
    setActiveTopicId(null);
    setScore(0);
    setCurrentQIndex(0);
  };

  // --- Backend Interaction (Updated for Server-Side Minting) ---
  const mintNFT = async () => {
    if (!publicKey) return alert("Please connect wallet first!");
    if (!activeTopic) return;

    setGameState('minting');
    const finalScore = Math.round((score / activeTopic.questions.length) * 100);

    try {
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toString(), 
          score: finalScore                 
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Mint failed");
      
      // Success! The server handled everything.
      alert(`Success! ${data.message || "Degree minting complete!"}`);
      setGameState('topic-select'); 

    } catch (error: any) {
      console.error(error);
      alert(`Minting Error: ${error.message}`);
      setGameState('success'); // Allow retry
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
      <Head><title>SolPoL Badges</title></Head>

      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center font-bold text-white">
            S
          </div>
          <span className="font-bold text-xl tracking-tight">SolPoL</span>
        </div>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-xl !font-semibold !h-10 !px-6" />
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center justify-center min-h-[60vh]">
        
        {/* VIEW: TOPIC SELECTION */}
        {gameState === 'topic-select' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                Verify Your Skills
              </h1>
              <p className="text-slate-400 text-lg">Select a topic, score 70%+, and mint your proof of knowledge.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(topic.id)}
                  className="group relative flex flex-col items-start p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-900/20 transition-all duration-300 text-left"
                >
                  <div className="p-3 rounded-lg bg-slate-800 text-purple-400 mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <topic.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-100">{topic.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">{topic.description}</p>
                  <div className="mt-auto flex items-center text-purple-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    Start Quiz <ArrowRight size={16} className="ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: QUIZ ACTIVE */}
        {gameState === 'quiz' && activeTopic && (
          <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-end mb-6">
              <div>
                <span className="text-purple-400 font-medium text-sm tracking-wider uppercase">Topic</span>
                <h2 className="text-2xl font-bold">{activeTopic.title}</h2>
              </div>
              <span className="text-slate-500 font-mono">
                {currentQIndex + 1} <span className="text-slate-700">/</span> {activeTopic.questions.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full mb-8 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentQIndex + 1) / activeTopic.questions.length) * 100}%` }}
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h3 className="text-xl font-medium text-slate-200 mb-8 leading-relaxed">
                {activeTopic.questions[currentQIndex].text}
              </h3>

              <div className="grid gap-3">
                {activeTopic.questions[currentQIndex].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    className="w-full p-4 text-left rounded-xl bg-slate-800/50 border border-slate-700 hover:border-purple-500 hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SUCCESS */}
        {gameState === 'success' && (
          <div className="text-center animate-in zoom-in-95 duration-300 max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Passed!</h2>
            <p className="text-slate-400 mb-8">
              You scored <span className="text-green-400 font-bold">{Math.round((score / (activeTopic?.questions.length || 1)) * 100)}%</span>.
              <br/>You are eligible for the badge.
            </p>
            
            <button
              onClick={mintNFT}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Mint Achievement NFT
            </button>
            <button onClick={resetGame} className="mt-4 text-slate-500 hover:text-slate-300 text-sm">
              Back to Topics
            </button>
          </div>
        )}

        {/* VIEW: FAIL */}
        {gameState === 'fail' && (
          <div className="text-center animate-in zoom-in-95 duration-300 max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Failed</h2>
            <p className="text-slate-400 mb-8">
              You scored <span className="text-red-400 font-bold">{Math.round((score / (activeTopic?.questions.length || 1)) * 100)}%</span>.
              <br/>You need 70% to pass.
            </p>
            
            <button
              onClick={() => {
                setGameState('quiz');
                setScore(0);
                setCurrentQIndex(0);
              }}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold border border-slate-700 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Retry Quiz
              </span>
            </button>
            <button onClick={resetGame} className="mt-4 text-slate-500 hover:text-slate-300 text-sm">
              Choose Different Topic
            </button>
          </div>
        )}

        {/* VIEW: MINTING */}
        {gameState === 'minting' && (
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Minting Degree...</h2>
            <p className="text-slate-400">Please wait while we mint your degree.</p>
          </div>
        )}

      </main>
    </div>
  );
}