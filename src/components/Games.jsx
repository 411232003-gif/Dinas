import { useState } from 'react';
import { Heart, Sparkles, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';

const questions = [
  "Apa hal paling romantis yang pernah aku lakukan untukmu?",
  "Apa hal favorit tentang diriku?",
  "Apa impian kita bersama yang ingin kamu wujudkan?",
  "Apa momen terindah yang pernah kita lalui bersama?",
  "Apa yang bikin kamu jatuh cinta padaku?",
  "Apa hal kecil yang aku lakukan yang selalu bikin kamu senang?",
  "Apa tempat yang ingin kita kunjungi bersama?",
  "Apa lagu yang mengingatkanmu padaku?",
  "Apa hadiah terbaik yang pernah aku berikan kepadamu?",
  "Apa kebiasaan kita yang paling kamu suka?",
];

const truthQuestions = [
  "Apa hal paling memalukan yang pernah terjadi saat kita bersama?",
  "Apa hal yang pernah kamu sembunyikan dariku?",
  "Apa yang paling kamu takutkan dalam hubungan kita?",
  "Apa hal yang pernah bikin kamu cemburu?",
  "Apa kebiasaanku yang paling mengganggu kamu?",
  "Apa yang pernah bikin kamu hampir menyerah pada kita?",
];

const loveChallenges = [
  "Kirim foto selfie termanis kamu sekarang!",
  "Bikin video singkat bilang 'I love you' dengan gaya unik",
  "Tulis 3 alasan kenapa kamu mencintaiku",
  "Kirim voice note nyanyikan potongan lagu romantis",
  "Bagikan foto favorit kita berdua",
  "Ceritakan momen pertama kali kita bertemu",
  "Bilang satu hal yang kamu pengakuin ke aku",
  "Kirim emoji yang paling mewakili perasaanmu sekarang",
];

export default function Games() {
  const [currentGame, setCurrentGame] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  const startGame = (gameType) => {
    setCurrentGame(gameType);
    setShowAnswer(false);
    
    if (gameType === 'quiz') {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
    } else if (gameType === 'truth') {
      const randomQuestion = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
      setCurrentQuestion(randomQuestion);
    } else if (gameType === 'challenge') {
      const randomChallenge = loveChallenges[Math.floor(Math.random() * loveChallenges.length)];
      setCurrentQuestion(randomChallenge);
    }
  };

  const nextQuestion = () => {
    setShowAnswer(false);
    
    if (currentGame === 'quiz') {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
    } else if (currentGame === 'truth') {
      const randomQuestion = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
      setCurrentQuestion(randomQuestion);
    } else if (currentGame === 'challenge') {
      const randomChallenge = loveChallenges[Math.floor(Math.random() * loveChallenges.length)];
      setCurrentQuestion(randomChallenge);
    }
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {!currentGame ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <Heart className="w-16 h-16 text-love-pink-dark mx-auto mb-4 animate-heartbeat" fill="#FF69B4" />
              <h2 className="text-2xl font-bold text-gradient mb-2">Love Games</h2>
              <p className="text-gray-600">Mainkan game seru untuk lebih mengenal satu sama lain!</p>
            </motion.div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame('quiz')}
                className="w-full glass-card rounded-2xl p-6 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-love-pink to-love-purple rounded-full">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Love Quiz</h3>
                    <p className="text-sm text-gray-500">Seberapa kenal kamu dengan pasanganmu?</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame('truth')}
                className="w-full glass-card rounded-2xl p-6 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Truth or Love</h3>
                    <p className="text-sm text-gray-500">Jujur tentang hubungan kita</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame('challenge')}
                className="w-full glass-card rounded-2xl p-6 text-left hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-rose-500 to-love-pink rounded-full">
                    <Shuffle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Love Challenge</h3>
                    <p className="text-sm text-gray-500">Tantangan romantis yang seru!</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentGame(null)}
                className="text-gray-500 hover:text-love-pink transition-colors"
              >
                ← Kembali
              </button>
              <h3 className="font-semibold text-gradient capitalize">
                {currentGame === 'quiz' ? 'Love Quiz' : currentGame === 'truth' ? 'Truth or Love' : 'Love Challenge'}
              </h3>
              <div className="w-16" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6"
            >
              <p className="text-lg text-gray-800 text-center font-medium">{currentQuestion}</p>
            </motion.div>

            <div className="flex gap-3">
              <button
                onClick={nextQuestion}
                className="flex-1 love-button py-3 flex items-center justify-center gap-2"
              >
                <Shuffle className="w-5 h-5" />
                Pertanyaan Selanjutnya
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Diskusikan jawaban bersama pasanganmu! 💕
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
