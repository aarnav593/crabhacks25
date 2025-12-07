// src/pages/index.tsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import confetti from 'canvas-confetti';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// --- Types & Quiz Data ---
type Question = {
  id: number;
  text: string;
  options: string[];
  correct: string;
};

// We need 5 questions so 4/5 correct = 80%, which passes the >70 backend check.
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Which data structure is essential for linking blocks in a blockchain?",
    options: ["Merkle Tree", "Linked List", "Hash Map", "Binary Heap"],
    correct: "Linked List"
  },
  {
    id: 2,
    text: "What is the primary benefit of 'Compressed NFTs' on Solana?",
    options: ["Higher storage costs", "Drastically lower minting costs", "Slower transaction speeds", "Centralized storage"],
    correct: "Drastically lower minting costs"
  },
  {
    id: 3,
    text: "What mechanism does Solana use to order transactions?",
    options: ["Proof of Work", "Proof of History (PoH)", "Proof of Stake", "Round Robin"],
    correct: "Proof of History (PoH)"
  },
  {
    id: 4,
    text: "Who signs a transaction to authorize a token transfer?",
    options: ["The Miner", "The Wallet Owner (Private Key)", "The Node Validator", "The API Provider"],
    correct: "The Wallet Owner (Private Key)"
  },
  {
    id: 5,
    text: "What is the native token used for transaction fees on Solana?",
    options: ["ETH", "BTC", "SOL", "USDC"],
    correct: "SOL"
  }
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { publicKey } = useWallet();
  const [gameState, setGameState] = useState<'start' | 'quiz' | 'minting' | 'success' | 'fail'>('start');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(()=>{
    setIsMounted(true);
  },[]);

  // --- Handlers ---

  const startQuiz = () => {
    setGameState('quiz');
    setCurrentQIndex(0);
    setScore(0);
  };

  const handleAnswer = (optionIndex: number) => {
    const isCorrect = QUESTIONS[currentQIndex].options[optionIndex] === QUESTIONS[currentQIndex].correct;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);
    
    if (currentQIndex < QUESTIONS.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      finishQuiz(newScore);
    }
  };

  const finishQuiz = (finalScore: number) => {
    // Calculate percentage (e.g., 80)
    const percentage = (finalScore / QUESTIONS.length) * 100;
    
    // Backend requires >= 70
    if (percentage >= 70) {
      setGameState('success');
      triggerConfetti();
    } else {
      setGameState('fail');
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };

  // --- THE MINT FUNCTION (Aligned with mint.ts) ---
  const mintNFT = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first!");
      return;
    }

    setGameState('minting');

    // Calculate final score again for the payload
    const finalScore = Math.round((score / QUESTIONS.length) * 100);

    try {
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toString(), // MATCHES 'userWallet' in mint.ts
          score: finalScore                 // MATCHES 'score' in mint.ts
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Success! Check your wallet for the NFT.");
        setGameState('start'); // Reset or keep in success state
      } else {
        throw new Error(data.error || "Minting failed");
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setGameState('success'); // Let them try again if it was a network error
    }
  };

  if(!isMounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Head>
        <title>Sol Edu Badges</title>
      </Head>

      {/* Wallet Button */}
      <nav style={{ position: 'absolute', top: 20, right: 20 }}>
        <WalletMultiButton style={{ backgroundColor: '#8b5cf6' }} />
      </nav>

      <main className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', textAlign: 'center' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '2rem' }}>🎓</span>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Sol Edu Badges</h1>
        </div>

        {/* VIEW: START */}
        {gameState === 'start' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Verify Your Skills</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
              Score 70% or higher to mint your compressed NFT Degree.
            </p>
            <button className="btn-primary" onClick={startQuiz}>
              Start Assessment
            </button>
          </div>
        )}

        {/* VIEW: QUIZ */}
        {gameState === 'quiz' && (
          <div className="fade-in">
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '30px' }}>
              <div style={{ 
                width: `${((currentQIndex + 1) / QUESTIONS.length) * 100}%`, 
                height: '100%', 
                background: 'var(--accent)',
                borderRadius: '10px',
                transition: 'width 0.3s ease' 
              }} />
            </div>

            <span style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>
              Question {currentQIndex + 1} of {QUESTIONS.length}
            </span>
            
            <h3 style={{ fontSize: '1.4rem', margin: '20px 0 30px' }}>
              {QUESTIONS[currentQIndex].text}
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {QUESTIONS[currentQIndex].options.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="quiz-option" // Ensure this class is in CSS or use inline styles below
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: MINTING (LOADING) */}
        {gameState === 'minting' && (
          <div className="fade-in">
            <div className="spinner" style={{ margin: '0 auto 30px', width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h2>Minting Degree...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Validating Score & Compressing NFT</p>
            <style jsx>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

        {/* VIEW: SUCCESS */}
        {gameState === 'success' && (
          <div className="fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏆</div>
            <h2 style={{ fontSize: '2rem', color: 'var(--accent)' }}>Passed!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
              You scored {Math.round((score / QUESTIONS.length) * 100)}%.
            </p>
            
            {publicKey ? (
               <button className="btn-primary" onClick={mintNFT}>
                 Mint Degree to Wallet
               </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <p>Connect wallet to claim reward</p>
                <WalletMultiButton style={{ backgroundColor: '#8b5cf6' }} />
              </div>
            )}
          </div>
        )}

        {/* VIEW: FAIL */}
        {gameState === 'fail' && (
          <div className="fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
            <h2 style={{ fontSize: '2rem', color: '#ef4444' }}>Test Failed</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
              You scored {Math.round((score / QUESTIONS.length) * 100)}%. <br/>You need 70% to pass.
            </p>
            <button 
              className="btn-primary" 
              onClick={startQuiz}
              style={{ background: 'transparent', border: '1px solid var(--border)' }}
            >
              Retry Quiz
            </button>
          </div>
        )}
      </main>
    </div>
  );
}