/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Play,
  Volume2,
  VolumeX,
  BookOpen,
  HelpCircle,
  Gamepad2,
  CheckCircle2,
  RotateCcw,
  Award,
  Sparkles,
  ArrowRight,
  ChevronRight,
  User,
  Heart,
  Star,
  Activity,
  Compass,
  Lightbulb,
  MessageSquare,
  Send,
  Check,
  X,
  Info,
  Layers,
  Flame,
  Shield,
  Zap
} from 'lucide-react';

// --- AUDIO SYNTHESIZER & SPEECH HELPERS ---
const playSound = (type: 'click' | 'correct' | 'wrong' | 'win', muted: boolean) => {
  if (muted) return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'win') {
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.15, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.2);
      });
    }
  } catch {
    // AudioContext blocked or not supported
  }
};

const speakText = (text: string, muted: boolean) => {
  if (muted || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
};

// --- QUIZ DATA (10 questions per level for Class V SD) ---
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const quizData: Record<'mudah' | 'sedang' | 'sulit', QuizQuestion[]> = {
  mudah: [
    {
      id: 1,
      question: "Sepak bola termasuk ke dalam jenis permainan bola... ?",
      options: ["Besar (Permainan Invasi)", "Kecil", "Air", "Lapangan Tunggal"],
      correct: 0,
      explanation: "Sepak bola adalah permainan bola besar yang dikategorikan sebagai permainan invasi (menyerang ke daerah pertahanan lawan)."
    },
    {
      id: 2,
      question: "Gerak mengoper bola kepada teman satu tim dinamakan... ?",
      options: ["Dribbling", "Passing", "Shooting", "Heading"],
      correct: 1,
      explanation: "Passing adalah teknik dasar mengumpan atau mengoper bola kepada rekan satu tim."
    },
    {
      id: 3,
      question: "Gerakan menggiring bola sambil berjalan atau berlari disebut... ?",
      options: ["Passing", "Dribbling", "Stopping", "Juggling"],
      correct: 1,
      explanation: "Dribbling adalah teknik menggiring bola untuk membawa bola maju melewati lawan."
    },
    {
      id: 4,
      question: "Bagian kaki yang paling sering digunakan untuk passing mendatar adalah... ?",
      options: ["Kura-kura kaki", "Ujung kaki", "Bagian dalam kaki", "Tumit"],
      correct: 2,
      explanation: "Bagian dalam kaki memberikan bidang sentuh yang luas dan akurasi tinggi saat melakukan passing mendatar."
    },
    {
      id: 5,
      question: "Berlari menuju arah gawang lawan termasuk contoh gerak... ?",
      options: ["Lokomotor", "Non-lokomotor", "Manipulatif", "Pasif"],
      correct: 0,
      explanation: "Gerak lokomotor adalah gerak berpindah tempat, seperti berlari dan berjalan."
    },
    {
      id: 6,
      question: "Meliukkan badan ke belakang sebelum menendang bola adalah contoh gerak... ?",
      options: ["Lokomotor", "Non-lokomotor", "Manipulatif", "Mengapung"],
      correct: 1,
      explanation: "Gerak non-lokomotor adalah gerakan yang dilakukan tanpa berpindah tempat (seperti meliukkan badan)."
    },
    {
      id: 7,
      question: "Menendang atau mengontrol bola dengan kaki melibatkan gerak... ?",
      options: ["Lokomotor", "Non-lokomotor", "Manipulatif", "Statis"],
      correct: 2,
      explanation: "Gerak manipulatif adalah gerak yang melibatkan penguasaan terhadap suatu objek (seperti bola)."
    },
    {
      id: 8,
      question: "Berapa jumlah pemain inti dalam satu tim sepak bola di lapangan... ?",
      options: ["9 pemain", "10 pemain", "11 pemain", "12 pemain"],
      correct: 2,
      explanation: "Setiap tim sepak bola terdiri dari 11 pemain di lapangan termasuk penjaga gawang."
    },
    {
      id: 9,
      question: "Tujuan utama permainan sepak bola adalah... ?",
      options: ["Memasukkan bola sebanyak-banyaknya ke gawang lawan", "Berlari secepat mungkin", "Menjaga bola agar tidak bergerak", "Melakukan akrobat"],
      correct: 0,
      explanation: "Tujuan utama permainan sepak bola adalah mencetak gol ke gawang lawan dan memenangi pertandingan."
    },
    {
      id: 10,
      question: "Sebelum melakukan praktik PJOK sepak bola, kita wajib melakukan... ?",
      options: ["Tidur siang", "Pemanasan (warming up)", "Makan berat", "Pulang ke rumah"],
      correct: 1,
      explanation: "Pemanasan sangat penting untuk melemaskan otot dan mencegah cedera saat berolahraga."
    }
  ],
  sedang: [
    {
      id: 1,
      question: "Manakah kombinasi gerak yang benar saat melakukan passing bola berpasangan... ?",
      options: ["Lokomotor dan non-lokomotor tanpa bola", "Manipulatif (menendang) dikombinasi lokomotor (berlari)", "Hanya berdiri diam", "Melompat di tempat"],
      correct: 1,
      explanation: "Saat passing, pemain melakukan gerak manipulatif (menendang bola) yang dikombinasikan dengan gerak lokomotor (berlari mencari ruang)."
    },
    {
      id: 2,
      question: "Bagian kaki manakah yang digunakan untuk menghasilkan laju bola melambung tinggi... ?",
      options: ["Kaki bagian dalam", "Kura-kura kaki bagian atas / punggung kaki", "Telapak kaki", "Mata kaki"],
      correct: 1,
      explanation: "Punggung kaki (kura-kura kaki) memberikan titik tumpu tenaga penuh untuk tendangan melambung jarak jauh."
    },
    {
      id: 3,
      question: "Dalam permainan invasi sepak bola, apa peran utama dari taktik passing yang cepat... ?",
      options: ["Mengulur waktu", "Memecah konsentrasi pertahanan lawan dan mempercepat alur serangan", "Membuat kelelahan sendiri", "Menghindari wasit"],
      correct: 1,
      explanation: "Passing cepat dalam permainan invasi sangat efektif untuk membongkar pertahanan rapat lawan."
    },
    {
      id: 4,
      question: "Bagaimanakah posisi badan saat melakukan dribbling (menggiring bola) yang benar... ?",
      options: ["Tubuh tegak kaku ke atas", "Tubuh condong ke depan dengan pandangan ke arah bola dan lapangan", "Tubuh berbaring", "Kepala menengadah ke langit"],
      correct: 1,
      explanation: "Condong ke depan memudahkan penguasaan bola sekaligus mengamati posisi kawan dan lawan."
    },
    {
      id: 5,
      question: "Saat menerima passing datang, pemain menghentikan bola menggunakan telapak kaki. Gerakan ini dikategorikan sebagai... ?",
      options: ["Manipulatif mengontrol bola", "Lokomotor murni", "Non-lokomotor melompat", "Acrobatic skill"],
      correct: 0,
      explanation: "Mengontrol atau menghentikan bola adalah bagian dari gerak manipulatif."
    },
    {
      id: 6,
      question: "Apa perbedaan utama antara gerak lokomotor dan non-lokomotor dalam sepak bola... ?",
      options: ["Lokomotor berpindah tempat, non-lokomotor tidak berpindah tempat", "Lokomotor memakai bola, non-lokomotor tidak", "Sama persis", "Non-lokomotor lebih cepat dari lokomotor"],
      correct: 0,
      explanation: "Definisi dasar: Lokomotor adalah gerak berpindah posisi, sedangkan non-lokomotor tetap di tempat poros."
    },
    {
      id: 7,
      question: "Mengapa kombinasi gerak lokomotor dan manipulatif sangat penting saat melewati lawan (dribbling)... ?",
      options: ["Agar terlihat hebat", "Agar gerakan membawa bola luwes, cepat, dan sulit direbut lawan", "Agar wasit memberi pujian", "Supaya penonton bersorak"],
      correct: 1,
      explanation: "Kombinasi gerak lari (lokomotor) dan kaki menguasai bola (manipulatif) membuat pemain lincah melewati lawan."
    },
    {
      id: 8,
      question: "Manakah contoh urutan gerak yang benar saat mencetak gol (shooting)... ?",
      options: ["Berlari (lokomotor) -> meliukkan badan (non-lokomotor) -> menendang bola ke gawang (manipulatif)", "Duduk -> tidur -> diam", "Menangis -> tertawa -> lari", "Berdiri diam sepanjang laga"],
      correct: 0,
      explanation: "Shooting melibatkan kombinasi lengkap: lari (lokomotor), liuk badan (non-lokomotor), dan tendangan keras (manipulatif)."
    },
    {
      id: 9,
      question: "Dalam permainan invasi sepak bola, jika tim kita sedang menyerang, maka strategi apa yang harus diterapkan... ?",
      options: ["Semua pemain diam di gawang sendiri", "Membangun kerja sama passing terarah dan mencari ruang kosong", "Menendang bola keluar lapangan", "Meminta wasit menghentikan pertandingan"],
      correct: 1,
      explanation: "Kerja sama passing dan pencarian ruang kosong adalah kunci keberhasilan menyerang dalam permainan invasi."
    },
    {
      id: 10,
      question: "Sikap fair play (sportivitas) yang harus dijunjung tinggi saat bermain sepak bola adalah... ?",
      options: ["Curang demi kemenangan", "Menghargai kawan, lawan, dan keputusan wasit", "Mengejek tim lawan yang kalah", "Memprotes wasit terus-menerus"],
      correct: 1,
      explanation: "Sportivitas mengajarkan kita untuk selalu menghormati sesama pemain dan aturan permainan."
    }
  ],
  sulit: [
    {
      id: 1,
      question: "Dalam analisis biomekanika tendangan passing jarak jauh, sudut perkenaan kaki dan titik tengah bola yang optimal untuk menghasilkan parabola ideal adalah... ?",
      options: ["Bagian bawah bola dengan perkenaan punggung kaki bawah", "Bagian atas bola dengan ujung jari", "Sisi samping bola dengan tumit", "Tepat di tengah bola dengan telapak kaki"],
      correct: 0,
      explanation: "Menendang sedikit ke arah bawah titik tengah bola menggunakan punggung kaki mengangkat bola membentuk parabola."
    },
    {
      id: 2,
      question: "Analisis kritis: Mengapa variasi gerak dribbling zig-zag sangat efektif dalam situasi one-on-one (satu lawan satu) dengan bek lawan... ?",
      options: ["Karena bek akan kebingungan membaca arah perubahan titik berat badan dan frekuensi sentuhan bola yang cepat", "Karena bola menjadi lebih berat", "Karena lapangan menjadi lebih sempit", "Karena peraturan mewajibkan zig-zag"],
      correct: 0,
      explanation: "Dribbling zig-zag mengubah sudut momentum secara cepat sehingga bek kesulitan merebut bola."
    },
    {
      id: 3,
      question: "Manakah pernyataan yang paling tepat mengenai integrasi gerak lokomotor, non-lokomotor, dan manipulatif dalam transisi menyerang ke bertahan... ?",
      options: ["Pemain melakukan lari sprint cepat (lokomotor), memutar badan mengantisipasi arah datangnya penyerang (non-lokomotor), dan melakukan tekel bersih / intersep bola (manipulatif)", "Pemain tidur di lapangan", "Pemain hanya berjalan santai", "Pemain bertepuk tangan"],
      correct: 0,
      explanation: "Transisi bertahan menuntut integrasi sempurna lari cepat, rotasi tubuh, dan penguasaan bola kembali."
    },
    {
      id: 4,
      question: "Dalam konteks permainan invasi (invasion games), karakteristik utama yang membedakannya dengan permainan lapangan lainnya adalah... ?",
      options: ["Adanya invasi atau penetrasi ke wilayah pertahanan lawan untuk mencetak skor secara langsung", "Tidak menggunakan bola sama sekali", "Hanya dimainkan di ruangan tertutup", "Tidak ada batasan waktu"],
      correct: 0,
      explanation: "Permainan invasi dicirikan oleh upaya kedua tim menerobos wilayah lawan secara aktif."
    },
    {
      id: 5,
      question: "Bagaimana cara mengevaluasi efektivitas passing pendek (short passing) dalam tekanan ketat lawan (pressing)... ?",
      options: ["Melalui kecepatan aliran bola, ketepatan sasaran ke kaki rekan, dan minimnya sentuhan yang tidak perlu (one-touch/two-touch passing)", "Melalui seberapa keras tendangan hingga menjebol gawang", "Melalui lamanya bola ditahan di kaki", "Melalui jumlah pemain yang terjatuh"],
      correct: 0,
      explanation: "Tekanan ketat diatasi dengan passing cepat satu-dua sentuhan yang akurat."
    },
    {
      id: 6,
      question: "Analisis gerak non-lokomotor manakah yang paling menentukan keseimbangan saat pemain melakukan tendangan keras (shooting power)... ?",
      options: ["Posisi kaki tumpu di samping bola dan tangan direntangkan untuk menjaga keseimbangan gravitasi", "Menutup kedua mata", "Melompat setinggi-tingginya", "Membungkuk 90 derajat"],
      correct: 0,
      explanation: "Kaki tumpu yang kokoh dan rentangan tangan adalah kunci non-lokomotor penyeimbang tubuh."
    },
    {
      id: 7,
      question: "Strategi open space (mencari ruang kosong) saat rekan setim membawa bola merupakan perpaduan antara... ?",
      options: ["Gerak lokomotor (berlari mencari celah) dan visi taktis membaca posisi lawan", "Gerak pasif diam di tempat", "Gerak melompat di tempat", "Duduk beristirahat"],
      correct: 0,
      explanation: "Mencari ruang kosong memerlukan keaktifan lokomotor berpindah tempat dan kecerdasan taktik."
    },
    {
      id: 8,
      question: "Dalam skenario pertandingan, jika seorang pemain melakukan dribbling dengan kecepatan tinggi lalu tiba-tiba berhenti mendadak (stop-and-go), analisis mekanika tubuh yang terjadi adalah... ?",
      options: ["Pemain mengerem langkah lokomotor dengan menurunkan pusat gravitasi (center of gravity) dan melindungi bola dengan tubuh (manipulatif)", "Pemain terjatuh karena tidak sengaja", "Pemain menendang bola ke penonton", "Pemain berhenti berpikir"],
      correct: 0,
      explanation: "Teknik stop-and-go mengecoh momentum lawan melalui penyesuaian pusat gravitasi tubuh."
    },
    {
      id: 9,
      question: "Manakah bentuk latihan kombinasi gerak yang paling ideal untuk meningkatkan keterampilan passing dan kontrol bola beruntun (passing drill)... ?",
      options: ["Latihan berpasangan atau rondo (passing square) dengan batasan sentuhan", "Menendang bola ke tembok tanpa aturan", "Berlari keliling lapangan tanpa bola", "Bermain catur"],
      correct: 0,
      explanation: "Latihan rondo atau passing square melatih kecepatan berpikir, akurasi passing, dan kontrol bola."
    },
    {
      id: 10,
      question: "Kesimpulan analisis pembelajaran PJOK sepak bola sebagai permainan invasi adalah... ?",
      options: ["Mengembangkan kebugaran jasmani, koordinasi gerak kompleks (lokomotor, non-lokomotor, manipulatif), kerja sama tim, dan sportivitas", "Hanya sekadar mencari keringat tanpa aturan", "Aktivitas yang tidak memiliki nilai edukasi", "Hanya hobi tanpa manfaat kesehatan"],
      correct: 0,
      explanation: "Sepak bola sebagai media pembelajaran mencakup aspek kognitif, afektif, dan psikomotorik secara menyeluruh."
    }
  ]
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);

  // Sub-tabs for Materi Belajar
  const [materiSubTab, setMateriSubTab] = useState<'pengantar' | 'passing_dribbling' | 'lokomotor' | 'taktik'>('pengantar');

  // Simulation State
  const [simState, setSimState] = useState<{
    ballPos: { x: number; y: number };
    playerPos: { x: number; y: number };
    action: 'idle' | 'passing' | 'dribbling' | 'shooting';
    speed: number;
    mode: 'lokomotor' | 'non-lokomotor' | 'manipulatif';
  }>({
    ballPos: { x: 50, y: 70 },
    playerPos: { x: 50, y: 80 },
    action: 'idle',
    speed: 1,
    mode: 'manipulatif'
  });

  // Quiz State
  const [quizLevel, setQuizLevel] = useState<'mudah' | 'sedang' | 'sulit' | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [quizAttemptCount, setQuizAttemptCount] = useState<number>(1);

  // Mini Game State
  const [gameScore, setGameScore] = useState<number>(0);
  const [gameStep, setGameStep] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [gameFeedback, setGameFeedback] = useState<string>('');

  // Reflection Board State
  const [reflections, setReflections] = useState<Array<{ id: string; name: string; feeling: string; message: string; date: string; color: string }>>([
    {
      id: '1',
      name: 'Shaka',
      feeling: 'Sangat Senang 😊',
      message: 'Seru sekali simulasi passing dan dribbling bola! Jadi paham bedanya gerak lokomotor lari dan manipulatif.',
      date: '16 Nov 2026',
      color: 'bg-amber-100 border-amber-300 text-amber-900'
    },
    {
      id: '2',
      name: 'Haflasea',
      feeling: 'Antusias 🌟',
      message: 'Kuisnya menantang dan dapat sertifikat! Seru banget belajar PJOK sepak bola interaktif ini.',
      date: '16 Nov 2026',
      color: 'bg-emerald-100 border-emerald-300 text-emerald-900'
    }
  ]);
  const [newName, setNewName] = useState<string>('');
  const [newFeeling, setNewFeeling] = useState<string>('Sangat Senang 😊');
  const [newMessage, setNewMessage] = useState<string>('');
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Load reflections from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pjok_reflections');
    if (saved) {
      try {
        setReflections(JSON.parse(saved));
      } catch {
        // fallback
      }
    }
  }, []);

  const saveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMessage.trim()) return;
    playSound('correct', audioMuted);
    const colors = [
      'bg-amber-100 border-amber-300 text-amber-900',
      'bg-emerald-100 border-emerald-300 text-emerald-900',
      'bg-sky-100 border-sky-300 text-sky-900',
      'bg-pink-100 border-pink-300 text-pink-900',
      'bg-purple-100 border-purple-300 text-purple-900'
    ];
    const newEntry = {
      id: Date.now().toString(),
      name: newName,
      feeling: newFeeling,
      message: newMessage,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    const updated = [newEntry, ...reflections];
    setReflections(updated);
    localStorage.setItem('pjok_reflections', JSON.stringify(updated));
    setNewName('');
    setNewMessage('');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Mini game items
  const gameChallenges = [
    {
      prompt: "Manakah gerakan pemain saat BERLARI mengejar bola di lapangan?",
      options: ["Gerak Lokomotor", "Gerak Non-Lokomotor", "Gerak Manipulatif"],
      correct: 0,
      hint: "Berlari melibatkan perpindahan tempat!"
    },
    {
      prompt: "Manakah gerakan saat MENGONTROL atau MENENDANG bola (passing)?",
      options: ["Gerak Lokomotor", "Gerak Non-Lokomotor", "Gerak Manipulatif"],
      correct: 2,
      hint: "Melibatkan penguasaan objek (bola)!"
    },
    {
      prompt: "Manakah gerakan MELIUKKAN BADAN di tempat saat bersiap menendang?",
      options: ["Gerak Lokomotor", "Gerak Non-Lokomotor", "Gerak Manipulatif"],
      correct: 1,
      hint: "Bergerak tanpa berpindah tempat!"
    },
    {
      prompt: "Teknik mengoper bola menggunakan bagian dalam kaki disebut... ?",
      options: ["Passing", "Dribbling", "Heading"],
      correct: 0,
      hint: "Mengoper bola ke teman tim."
    }
  ];

  const handleGameAnswer = (optIdx: number) => {
    playSound('click', audioMuted);
    const current = gameChallenges[gameStep];
    if (optIdx === current.correct) {
      playSound('correct', audioMuted);
      setGameScore(s => s + 25);
      setGameFeedback('Hebat! Jawaban Kamu Benar! 🎉');
      setTimeout(() => {
        setGameFeedback('');
        if (gameStep < gameChallenges.length - 1) {
          setGameStep(s => s + 1);
        } else {
          setGameFinished(true);
          playSound('win', audioMuted);
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        }
      }, 1200);
    } else {
      playSound('wrong', audioMuted);
      setGameFeedback('Kurang tepat. Coba ingat lagi petunjuknya! 💪');
      setTimeout(() => setGameFeedback(''), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] text-slate-800 flex flex-col font-sans selection:bg-emerald-200">
      
      {/* HEADER & NAVIGASI */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { playSound('click', audioMuted); setActiveTab('home'); }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-futbol text-xl animate-spin-slow"></i>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg lg:text-xl text-emerald-900 leading-tight">
                PJOK Kelas V <span className="text-emerald-600">Sepak Bola</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Permainan Invasi • Kurikulum Merdeka</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {activeTab !== 'home' && (
            <button
              onClick={() => { playSound('click', audioMuted); setActiveTab('home'); }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-house"></i>
              <span className="hidden sm:inline">Menu Utama</span>
            </button>
          )}

          <button
            onClick={() => {
              const nextMuted = !audioMuted;
              setAudioMuted(nextMuted);
              playSound('click', nextMuted);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              audioMuted 
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
            title={audioMuted ? "Suara Dimatikan" : "Suara Aktif"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">Suara AI {audioMuted ? 'OFF' : 'ON'}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 pt-6 lg:pt-10">
        
        {/* ==================== 1. MENU UTAMA (HOME) ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 lg:p-12 shadow-xl shadow-emerald-900/10">
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-15 pointer-events-none">
                <i className="fa-solid fa-futbol text-[280px]"></i>
              </div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase text-emerald-100">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Media Pembelajaran Interaktif Digital
                </div>
                <h2 className="text-3xl lg:text-5xl font-display font-bold tracking-tight leading-tight">
                  Jelajahi Serunya Permainan <span className="text-yellow-300">Sepak Bola!</span>
                </h2>
                <p className="text-emerald-100 text-sm lg:text-base leading-relaxed">
                  Mari belajar analisis variasi gerak passing & dribbling, kombinasi lokomotor & non-lokomotor dalam permainan invasi sepak bola untuk Kelas V Sekolah Dasar dengan cara yang seru dan menyenangkan.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => { 
                      playSound('click', audioMuted); 
                      setActiveTab('tujuan'); 
                      speakText("Mari kita mulai perjalanan belajar tujuan pembelajaran sepak bola.", audioMuted);
                    }}
                    className="px-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-display font-bold text-sm shadow-lg shadow-yellow-400/30 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-900" /> Mulai Belajar Sekarang
                  </button>
                  <button
                    onClick={() => { 
                      playSound('click', audioMuted); 
                      setActiveTab('materi'); 
                      speakText("Mari jelajahi materi interaktif sepak bola.", audioMuted);
                    }}
                    className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-display font-bold text-sm border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" /> Buka Materi Belajar
                  </button>
                </div>
              </div>
            </div>

            {/* Illustration Banner requested by user */}
            <div className="rounded-3xl bg-white border border-emerald-100 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="w-48 h-48 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center p-4 shadow-inner relative overflow-hidden group">
                  <img 
                    src="https://i.ibb.co.com/hFJHmgp2/Desain-tanpa-judul-9.png" 
                    alt="Ilustrasi PJOK Sepak Bola" 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="w-full md:w-2/3 space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  <i className="fa-solid fa-graduation-cap"></i> Panduan Belajar Interaktif Kelas 5
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-bold text-slate-800">
                  Belajar, Bermain, & Mengeksplorasi Gerak Invasi
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Multimedia ini dilengkapi dengan kuis evaluasi 3 level berhadiah sertifikat, simulasi lapangan interaktif, mini-game edukatif, serta papan refleksi digital bersama teman-teman sekelas seperti Shaka dan Haflasea.
                </p>
              </div>
            </div>

            {/* Quick Navigation Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" /> Menu Utama Pembelajaran
                </h3>
                <span className="text-xs font-semibold text-slate-400">Pilih menu untuk mulai</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'tujuan', title: 'Tujuan Pembelajaran', desc: 'Target kompetensi dan indikator belajar', icon: 'fa-bullseye', color: 'bg-amber-500 text-white' },
                  { id: 'pemantik', title: 'Pertanyaan Pemantik', desc: 'Flip card mindfulness & rasa ingin tahu', icon: 'fa-lightbulb', color: 'bg-blue-500 text-white' },
                  { id: 'materi', title: 'Materi Belajar', desc: 'Passing, dribbling & variasi gerak', icon: 'fa-book-open', color: 'bg-emerald-600 text-white' },
                  { id: 'simulasi', title: 'Simulasi Lapangan', desc: 'Praktik virtual taktik gerak bola', icon: 'fa-gamepad', color: 'bg-purple-600 text-white' },
                  { id: 'kuis', title: 'Kuis Interaktif', desc: '3 Level soal & sertifikat kelulusan', icon: 'fa-award', color: 'bg-rose-500 text-white' },
                  { id: 'games', title: 'Mini Games Edukatif', desc: 'Game pencocokan gerak & strategi', icon: 'fa-puzzle-piece', color: 'bg-indigo-600 text-white' },
                  { id: 'kesimpulan', title: 'Kesimpulan Materi', desc: 'Rangkuman pemahaman komprehensif', icon: 'fa-clipboard-check', color: 'bg-teal-600 text-white' },
                  { id: 'refleksi', title: 'Papan Refleksi', desc: 'Jurnal digital & sticky notes siswa', icon: 'fa-comments', color: 'bg-amber-600 text-white' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      playSound('click', audioMuted);
                      setActiveTab(item.id);
                      speakText(`Membuka menu ${item.title}`, audioMuted);
                    }}
                    className="p-5 rounded-3xl bg-white border border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform`}>
                        <i className={`fa-solid ${item.icon}`}></i>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==================== 2. TUJUAN PEMBELAJARAN ==================== */}
        {activeTab === 'tujuan' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-bullseye"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Tujuan Pembelajaran</h2>
                  <p className="text-xs text-slate-500">Kurikulum Merdeka • Kelas V SD • Mata Pelajaran PJOK</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    num: '01',
                    title: 'Analisis Passing & Dribbling',
                    desc: 'Siswa dapat menganalisis variasi gerak passing (mengumpan) dan dribbling (menggiring bola) yang efektif dalam permainan sepak bola.',
                    icon: 'fa-bolt',
                    color: 'from-amber-500 to-orange-500'
                  },
                  {
                    num: '02',
                    title: 'Kombinasi Lokomotor & Manipulatif',
                    desc: 'Siswa dapat mengidentifikasi kombinasi gerak lokomotor (berlari) dan manipulatif (melewati lawan) saat situasi menyerang.',
                    icon: 'fa-running',
                    color: 'from-emerald-500 to-teal-600'
                  },
                  {
                    num: '03',
                    title: 'Analisis Gerak Dasar',
                    desc: 'Siswa dapat merinci analisis gerakan lokomotor dan non-lokomotor dalam rangkaian teknik dasar permainan sepak bola.',
                    icon: 'fa-brain',
                    color: 'from-blue-500 to-indigo-600'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 p-6 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-r ${item.color} text-white font-display font-bold text-sm flex items-center justify-center shadow-md`}>
                          {item.num}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-sm">
                          <i className={`fa-solid ${item.icon}`}></i>
                        </div>
                      </div>
                      <h3 className="font-display font-bold text-slate-800 text-lg">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Indikator Ketercapaian Utama
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-slate-700 space-y-2">
                <h4 className="font-display font-bold text-emerald-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-600" /> Manfaat Pembelajaran Bagi Siswa
                </h4>
                <p className="text-xs lg:text-sm leading-relaxed">
                  Dengan memahami kombinasi gerak dasar dalam permainan invasi sepak bola, siswa tidak hanya meningkatkan kebugaran jasmani dan kesehatan jantung, tetapi juga melatih kerja sama tim (teamwork), kedisiplinan, sportivitas, serta kemampuan berpikir taktis dalam memecahkan masalah di lapangan.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('pemantik'); }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Lanjut ke Pertanyaan Pemantik <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. PERTANYAAN PEMANTIK ==================== */}
        {activeTab === 'pemantik' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-lightbulb"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Pertanyaan Pemantik & Mindfulness</h2>
                  <p className="text-xs text-slate-500">Memicu rasa ingin tahu sebelum memasuki materi inti</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    id: 1,
                    title: "Pertanyaan 1: Gerak Penetrasi",
                    question: "Pernahkah kamu memperhatikan bagaimana pemain penyerang lari melewati penjaga lawan dalam pertandingan sepak bola? Kira-kira gerak apa saja yang mereka gunakan?",
                    answer: "Pemain memadukan gerak lokomotor (berlari cepat / mengubah arah) dengan gerak manipulatif (menggiring bola dan mengontrol bola dengan kaki) agar lawan terkecoh!"
                  },
                  {
                    id: 2,
                    title: "Pertanyaan 2: Kerja Sama Tim",
                    question: "Mengapa pemain tidak bisa hanya membawa bola sendiri terus-menerus tanpa melakukan passing (mengumpan) kepada teman satu tim?",
                    answer: "Karena sepak bola adalah permainan invasi beregu. Kerja sama passing yang akurat akan memecah pertahanan rapat lawan dan menciptakan peluang gol yang lebih besar."
                  }
                ].map((item) => {
                  const flipped = !!flippedCards[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        playSound('click', audioMuted);
                        setFlippedCards(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      className="cursor-pointer rounded-3xl border border-slate-200 p-6 bg-gradient-to-br from-slate-50 to-emerald-50/30 hover:border-emerald-300 transition-all shadow-sm flex flex-col justify-between min-h-[240px]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {item.title}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                            <i className="fa-solid fa-rotate"></i> {flipped ? "Klik untuk lihat soal" : "Klik untuk buka jawaban"}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-slate-800 text-base leading-snug">
                          {flipped ? "💡 Penjelasan Konsep:" : item.question}
                        </h3>
                        {flipped && (
                          <p className="text-xs text-emerald-800 bg-emerald-100/70 p-3 rounded-xl leading-relaxed animate-fadeIn">
                            {item.answer}
                          </p>
                        )}
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-200 text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>Aktivitas Mindfulness & Eksplorasi</span>
                        <span className="text-emerald-600 font-bold">{flipped ? "Tutup" : "Buka Kartu"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('tujuan'); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('materi'); }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Lanjut ke Materi Belajar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. MATERI BELAJAR INTERAKTIF ==================== */}
        {activeTab === 'materi' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-book-open"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Materi Belajar Interaktif</h2>
                  <p className="text-xs text-slate-500">Permainan Invasi: Sepak Bola (Passing, Dribbling, Lokomotor)</p>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
                {[
                  { id: 'pengantar', label: '1. Pengantar Invasi' },
                  { id: 'passing_dribbling', label: '2. Passing & Dribbling' },
                  { id: 'lokomotor', label: '3. Lokomotor & Non-Lokomotor' },
                  { id: 'taktik', label: '4. Taktik & Manipulatif' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playSound('click', audioMuted);
                      setMateriSubTab(tab.id as typeof materiSubTab);
                      speakText(`Membaca materi ${tab.label}`, audioMuted);
                    }}
                    className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      materiSubTab === tab.id
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab Content */}
              <div className="space-y-6 pt-2">
                {materiSubTab === 'pengantar' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 space-y-3">
                      <h3 className="text-lg font-display font-bold text-emerald-900 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-emerald-600"></i> Apa itu Permainan Invasi?
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-700 leading-relaxed">
                        <strong>Permainan invasi (invasion games)</strong> adalah jenis permainan bola besar beregu di mana setiap tim harus menyerang (menginvasi) daerah pertahanan lawan untuk mencetak skor sebanyak-banyaknya, sekaligus mempertahankan daerah pertahanannya sendiri dari serangan lawan.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                        <h4 className="font-display font-bold text-slate-800 flex items-center gap-2">
                          <i className="fa-solid fa-futbol text-emerald-600"></i> Karakteristik Utama Sepak Bola
                        </h4>
                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                          <li>Dimainkan oleh 2 tim yang masing-masing terdiri dari 11 pemain.</li>
                          <li>Menggunakan kaki (dan seluruh anggota tubuh kecuali tangan/lengan) untuk menguasai bola.</li>
                          <li>Durasi pertandingan standar adalah 2 x 45 menit.</li>
                          <li>Melibatkan kerja sama tim, operan taktis, dan transisi menyerang ke bertahan yang cepat.</li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                        <h4 className="font-display font-bold text-slate-800 flex items-center gap-2">
                          <i className="fa-solid fa-star text-amber-500"></i> Nilai Karakter Pancasila
                        </h4>
                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                          <li><strong>Gotong Royong:</strong> Bekerja sama mengalirkan bola ke gawang lawan.</li>
                          <li><strong>Kemandirian:</strong> Percaya diri mengambil keputusan saat membawa bola.</li>
                          <li><strong>Sportivitas:</strong> Menghormati keputusan wasit dan menghargai lawan main.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {materiSubTab === 'passing_dribbling' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          01
                        </div>
                        <h3 className="text-lg font-display font-bold text-slate-800">Teknik Passing (Mengoper)</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Passing adalah teknik memberikan bola ke teman satu tim. Variasi utama:
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                          <li><strong>Passing Kaki Bagian Dalam:</strong> Paling sering digunakan untuk operan jarak pendek dengan akurasi tinggi.</li>
                          <li><strong>Passing Punggung Kaki:</strong> Digunakan untuk operan jarak jauh dan tendangan keras.</li>
                          <li><strong>Passing Kaki Bagian Luar:</strong> Untuk mengecoh arah operan secara mendadak.</li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-blue-200 bg-white p-6 space-y-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          02
                        </div>
                        <h3 className="text-lg font-display font-bold text-slate-800">Teknik Dribbling (Menggiring)</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Dribbling adalah cara membawa bola menggunakan kaki maju ke depan menghindari lawan:
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                          <li><strong>Dribbling Kaki Bagian Dalam:</strong> Kontrol bola sangat baik saat berjalan atau berlari pelan.</li>
                          <li><strong>Dribbling Kaki Bagian Luar:</strong> Memungkinkan pemain berlari lebih cepat sambil melindungi bola.</li>
                          <li><strong>Dribbling Zig-Zag:</strong> Sangat efektif melewati rintangan atau pemain bertahan lawan.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {materiSubTab === 'lokomotor' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 space-y-3">
                      <h3 className="text-lg font-display font-bold text-amber-900 flex items-center gap-2">
                        <i className="fa-solid fa-person-running text-amber-600"></i> Analisis Gerak Lokomotor & Non-Lokomotor
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-700 leading-relaxed">
                        Dalam setiap detik permainan sepak bola, tubuh kita melakukan tiga kategori gerak utama yang saling berkesinambungan:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                          L
                        </div>
                        <h4 className="font-display font-bold text-slate-800 text-sm">Gerak Lokomotor</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Gerakan berpindah tempat, contohnya: <strong>berlari mengejar bola, melompat menyundul bola, berjalan mencari posisi terbuka</strong>.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                          NL
                        </div>
                        <h4 className="font-display font-bold text-slate-800 text-sm">Gerak Non-Lokomotor</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Gerakan tanpa berpindah tempat, contohnya: <strong>meliukkan badan ke belakang sebelum menendang, berdiri seimbang, mengayun lengan</strong>.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                          M
                        </div>
                        <h4 className="font-display font-bold text-slate-800 text-sm">Gerak Manipulatif</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Gerakan melibatkan penguasaan objek/benda, contohnya: <strong>menendang (passing/shooting), menggiring (dribbling), menghentikan bola (stopping)</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {materiSubTab === 'taktik' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                      <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-chess-board text-indigo-600"></i> Strategi Taktik Melewati Lawan
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Dalam permainan invasi sepak bola, melewati lawan tidak cukup hanya dengan kecepatan lari, melainkan kecerdasan taktis:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1">
                          <h4 className="font-display font-bold text-indigo-900 text-sm">1. Wall Pass (Operan Satu-Dua)</h4>
                          <p className="text-xs text-slate-600">
                            Pemain mengoper bola ke teman lalu berlari cepat melintasi bek lawan untuk menerima bola kembali.
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
                          <h4 className="font-display font-bold text-emerald-900 text-sm">2. Open Space (Mencari Ruang Kosong)</h4>
                          <p className="text-xs text-slate-600">
                            Pemain tanpa bola aktif bergerak mencari celah kosong agar rekan satu tim mudah memberikan operan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('pemantik'); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('simulasi'); }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Lanjut ke Simulasi Lapangan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. SIMULASI LAPANGAN INTERAKTIF ==================== */}
        {activeTab === 'simulasi' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-gamepad"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Simulasi Lapangan Sepak Bola</h2>
                  <p className="text-xs text-slate-500">Praktik Virtual Interaktif: Passing, Dribbling, & Analisis Gerak</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Simulation SVG Stage */}
                <div className="lg:col-span-2 rounded-3xl bg-slate-900 p-4 shadow-inner flex flex-col items-center justify-between relative overflow-hidden border-4 border-emerald-500">
                  <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white">
                    <span>🟢 Lapangan Interaktif</span>
                    <span className="text-yellow-300">Aksi: {simState.action.toUpperCase()}</span>
                    <span>Modus: Praktik PJOK</span>
                  </div>

                  <div className="w-full h-[340px] flex items-center justify-center relative mt-10">
                    <svg className="w-full h-full rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-lg border-2 border-white/20" viewBox="0 0 600 350">
                      {/* Field Markings */}
                      <rect x="20" y="20" width="560" height="310" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.6" rx="10" />
                      <line x1="20" y1="175" x2="580" y2="175" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
                      <circle cx="300" cy="175" r="50" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
                      <circle cx="300" cy="175" r="4" fill="white" />
                      {/* Goals */}
                      <rect x="240" y="10" width="120" height="20" fill="none" stroke="white" strokeWidth="3" />
                      <rect x="240" y="320" width="120" height="20" fill="none" stroke="white" strokeWidth="3" />

                      {/* Defender */}
                      <g transform={simState.action === 'dribbling' ? "translate(350, 140)" : "translate(300, 130)"} className={`transition-transform duration-700 ${simState.action !== 'idle' ? 'animate-player-pulse' : ''}`}>
                        <circle cx="0" cy="0" r="18" fill="#ef4444" stroke="white" strokeWidth="2" />
                        <text x="0" y="5" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">DEF</text>
                      </g>

                      {/* Teammate */}
                      <g transform={simState.action === 'passing' ? "translate(450, 80)" : "translate(420, 90)"} className={`transition-transform duration-700 ${simState.action !== 'idle' ? 'animate-player-pulse' : ''}`}>
                        <circle cx="0" cy="0" r="18" fill="#0ea5e9" stroke="white" strokeWidth="2" />
                        <text x="0" y="5" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">REC</text>
                      </g>

                      {/* Player P1 */}
                      <g transform={simState.action === 'dribbling' ? "translate(280, 170)" : "translate(180, 260)"} className={`transition-transform duration-700 ${simState.action !== 'idle' ? 'animate-player-pulse' : ''}`}>
                        <circle cx="0" cy="0" r="20" fill="#f59e0b" stroke="white" strokeWidth="2" />
                        <text x="0" y="5" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">P1</text>
                      </g>

                      {/* Ball */}
                      <g transform={
                        simState.action === 'passing' ? "translate(430, 95)" :
                        simState.action === 'dribbling' ? "translate(290, 155)" :
                        simState.action === 'shooting' ? "translate(300, 30)" : "translate(180, 240)"
                      } className="transition-transform duration-700">
                        <circle cx="0" cy="0" r="10" fill="white" stroke="#0f172a" strokeWidth="2" />
                        <text x="0" y="3" fontSize="10" textAnchor="middle">⚽</text>
                      </g>
                    </svg>
                  </div>

                  <div className="w-full text-center bg-black/60 backdrop-blur-md py-2.5 px-4 rounded-xl text-xs font-medium text-emerald-200 mt-3">
                    {simState.action === 'idle' && "▶️ Pilih menu drill di sebelah kanan untuk melihat animasi praktik nyata di lapangan!"}
                    {simState.action === 'passing' && "⚡ Passing Berhasil: Bola meluncur akurat dari P1 (Manipulatif) menuju REC!"}
                    {simState.action === 'dribbling' && "⚡ Dribbling Berhasil: P1 melewati DEF dengan kombinasi lokomotor & manipulatif!"}
                    {simState.action === 'shooting' && "⚽ GOOOAL! Tendangan keras P1 melesat mulus menjebol gawang lawan (Shooting Power)!"}
                  </div>
                </div>

                {/* Control Deck */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" /> Kontrol Simulasi
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tekan tombol di bawah untuk menjalankan simulasi taktik sepak bola secara visual.
                    </p>

                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => {
                          playSound('correct', audioMuted);
                          setSimState(prev => ({ ...prev, action: 'passing' }));
                          speakText("Melakukan passing atau operan bola ke teman satu tim.", audioMuted);
                        }}
                        className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-between cursor-pointer ${
                          simState.action === 'passing'
                            ? 'bg-emerald-600 text-white shadow-emerald-600/30 scale-102'
                            : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-share text-emerald-500 text-base"></i> Simulasi Passing (Mengoper)
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          playSound('correct', audioMuted);
                          setSimState(prev => ({ ...prev, action: 'dribbling' }));
                          speakText("Melakukan dribbling atau menggiring bola melewati lawan.", audioMuted);
                        }}
                        className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-between cursor-pointer ${
                          simState.action === 'dribbling'
                            ? 'bg-purple-600 text-white shadow-purple-600/30 scale-102'
                            : 'bg-white hover:bg-purple-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-running text-purple-500 text-base"></i> Simulasi Dribbling (Menggiring)
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          playSound('win', audioMuted);
                          setSimState(prev => ({ ...prev, action: 'shooting' }));
                          speakText("Melakukan tendangan keras atau shooting ke gawang lawan, Gol!", audioMuted);
                          confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
                        }}
                        className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-between cursor-pointer ${
                          simState.action === 'shooting'
                            ? 'bg-rose-600 text-white shadow-rose-600/30 scale-102'
                            : 'bg-white hover:bg-rose-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-futbol text-rose-500 text-base"></i> Simulasi Shooting (Menembak Gol)
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          playSound('click', audioMuted);
                          setSimState(prev => ({ ...prev, action: 'idle' }));
                          speakText("Simulasi direset ke posisi awal.", audioMuted);
                        }}
                        className="w-full py-3 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-display font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset Posisi Lapangan
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500" /> Analisis Gerak:
                    </span>
                    <p>
                      {simState.action === 'idle' && "Pilih tombol aksi di atas untuk melihat animasi perpindahan pemain dan bola."}
                      {simState.action === 'passing' && "Passing melatih akurasi gerak manipulatif kaki bagian dalam dan kerja sama regu."}
                      {simState.action === 'dribbling' && "Dribbling memadukan kecepatan lari (lokomotor) dengan kelincahan menguasai bola (manipulatif)."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('materi'); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('kuis'); }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Lanjut ke Kuis Evaluasi <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. KUIS INTERAKTIF ==================== */}
        {activeTab === 'kuis' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-award"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Kuis Evaluasi Interaktif</h2>
                  <p className="text-xs text-slate-500">Uji kemampuan pemahaman materi sepak bola kelas V SD</p>
                </div>
              </div>

              {!quizStarted ? (
                <div className="space-y-6 max-w-xl mx-auto py-4">
                  <div className="space-y-2 text-center">
                    <h3 className="text-xl font-display font-bold text-slate-800">Masukkan Nama & Pilih Level Kuis</h3>
                    <p className="text-xs text-slate-500">Isi nama lengkapmu untuk mendapatkan sertifikat kelulusan di akhir kuis.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Contoh: Shaka atau Haflasea"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Tingkat Kesulitan Soal</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'mudah', title: 'Mudah', desc: '10 Soal Dasar', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                          { id: 'sedang', title: 'Sedang', desc: '10 Soal Analisis', color: 'border-blue-200 bg-blue-50 text-blue-800' },
                          { id: 'sulit', title: 'Sulit', desc: '10 Soal Ahli', color: 'border-purple-200 bg-purple-50 text-purple-800' }
                        ].map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => { playSound('click', audioMuted); setQuizLevel(lvl.id as typeof quizLevel); }}
                            className={`p-4 rounded-2xl border-2 transition-all text-center cursor-pointer ${
                              quizLevel === lvl.id
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg scale-105'
                                : `${lvl.color} hover:scale-102`
                            }`}
                          >
                            <h4 className="font-display font-bold text-sm">{lvl.title}</h4>
                            <span className="text-[10px] opacity-80 mt-1 block">{lvl.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={!studentName.trim() || !quizLevel}
                      onClick={() => {
                        if (!studentName.trim() || !quizLevel) return;
                        playSound('correct', audioMuted);
                        setQuizAttemptCount(c => c + 1);
                        setQuizStarted(true);
                        setCurrentQIndex(0);
                        setScore(0);
                        setQuizCompleted(false);
                        setSelectedOption(null);
                        setShowExplanation(false);
                        speakText(`Memulai kuis tingkat ${quizLevel}. Semangat ${studentName}!`, audioMuted);
                      }}
                      className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" /> Mulai Kuis Sekarang
                    </button>
                  </div>
                </div>
              ) : !quizCompleted ? (
                <div className="space-y-6 max-w-2xl mx-auto py-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                        Level: {quizLevel}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Soal {currentQIndex + 1} dari {quizData[quizLevel!].length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Skor: {score}</span>
                      <button
                        onClick={() => {
                          setQuizStarted(false);
                          setQuizLevel(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        Ganti Level
                      </button>
                    </div>
                  </div>

                  {/* Question Card */}
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-slate-800 text-lg lg:text-xl leading-relaxed">
                      {quizData[quizLevel!][currentQIndex].question}
                    </h3>

                    <div className="space-y-3">
                      {quizData[quizLevel!][currentQIndex].options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === quizData[quizLevel!][currentQIndex].correct;
                        let btnStyle = "bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-800";
                        
                        if (showExplanation) {
                          if (isCorrect) btnStyle = "bg-emerald-500 border-emerald-600 text-white font-bold shadow-md";
                          else if (isSelected && !isCorrect) btnStyle = "bg-rose-500 border-rose-600 text-white font-bold";
                          else btnStyle = "bg-slate-100 border-slate-200 text-slate-400 opacity-60";
                        } else if (isSelected) {
                          btnStyle = "bg-emerald-100 border-emerald-400 text-emerald-900 font-bold";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={showExplanation}
                            onClick={() => {
                              playSound('click', audioMuted);
                              setSelectedOption(idx);
                            }}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer text-sm ${btnStyle}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-xl bg-white/80 text-slate-700 flex items-center justify-center font-bold text-xs shadow-sm">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </span>
                            {showExplanation && isCorrect && <Check className="w-5 h-5 text-white" />}
                            {showExplanation && isSelected && !isCorrect && <X className="w-5 h-5 text-white" />}
                          </button>
                        );
                      })}
                    </div>

                    {showExplanation && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-slate-700 space-y-2 animate-fadeIn">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-emerald-600" /> Penjelasan Jawaban:
                        </span>
                        <p>{quizData[quizLevel!][currentQIndex].explanation}</p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      {!showExplanation ? (
                        <button
                          disabled={selectedOption === null}
                          onClick={() => {
                            if (selectedOption === null) return;
                            const currentQ = quizData[quizLevel!][currentQIndex];
                            const correct = selectedOption === currentQ.correct;
                            if (correct) {
                              playSound('correct', audioMuted);
                              setScore(s => s + 10);
                            } else {
                              playSound('wrong', audioMuted);
                            }
                            setShowExplanation(true);
                          }}
                          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-display font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          Periksa Jawaban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            playSound('click', audioMuted);
                            if (currentQIndex < quizData[quizLevel!].length - 1) {
                              setCurrentQIndex(i => i + 1);
                              setSelectedOption(null);
                              setShowExplanation(false);
                            } else {
                              setQuizCompleted(true);
                              playSound('win', audioMuted);
                              confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
                              const finalScore = score;
                              const motivationalMsg = finalScore <= 50 
                                ? "Jangan berkecil hati, mari kita perbaiki bersama bagian materi yang masih belum dipahami."
                                : finalScore <= 70
                                ? "Usahamu sudah terlihat baik, sedikit lagi kamu bisa mencapai hasil yang jauh lebih maksimal."
                                : "Luar biasa! Pemahamanmu terhadap materi sangat baik, teruslah kembangkan potensimu lebih jauh lagi.";
                              speakText(`${studentName}. ${motivationalMsg}`, audioMuted);
                            }
                          }}
                          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          {currentQIndex < quizData[quizLevel!].length - 1 ? "Soal Selanjutnya" : "Lihat Sertifikat Hasil"} <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Quiz Completed & Certificate View */
                <div className="space-y-6 max-w-2xl mx-auto py-4 text-center animate-fadeIn">
                  
                  {/* Certificate Print Container */}
                  <div id="certificate-print-area" className="p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-8 border-emerald-600 shadow-2xl text-slate-800 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                      <i className="fa-solid fa-award text-9xl text-emerald-600"></i>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest font-bold text-emerald-700">Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi</p>
                      <h3 className="font-display font-bold text-2xl lg:text-3xl text-slate-900">SERTIFIKAT PENGHARGAAN KOMPETENSI</h3>
                      <p className="text-xs text-slate-500">Nomor : {quizAttemptCount} / {quizLevel ? quizLevel.toUpperCase() : 'MUDAH'} / PJOK-SDN 194 / {new Date().getFullYear()}</p>
                    </div>

                    <div className="space-y-3 py-2">
                      <p className="text-xs text-slate-600 italic">Diberikan dengan bangga kepada:</p>
                      <h4 className="font-display font-extrabold text-3xl lg:text-4xl text-emerald-800 tracking-tight underline decoration-yellow-400 decoration-wavy underline-offset-8">
                        {studentName}
                      </h4>
                      <p className="text-xs lg:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed pt-2">
                        Atas prestasi gemilang dan keberhasilan menuntaskan Evaluasi Kuis Interaktif Media Pembelajaran PJOK Kelas V SD pada materi <strong className="text-slate-900">Permainan Invasi (Sepak Bola)</strong>.
                      </p>
                    </div>

                    <div className="flex justify-center items-center gap-6 py-2">
                      <div className="px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-md">
                        <span className="text-[10px] block uppercase font-bold text-emerald-200">Perolehan Skor</span>
                        <span className="font-display font-bold text-2xl">{score} / 100</span>
                      </div>
                      <div className="px-5 py-3 rounded-2xl bg-amber-500 text-slate-900 shadow-md">
                        <span className="text-[10px] block uppercase font-bold text-amber-900">Tingkat Kuis</span>
                        <span className="font-display font-bold text-2xl">{quizLevel?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-xs font-semibold text-emerald-900 max-w-lg mx-auto leading-relaxed">
                      "{score <= 50 
                        ? "Jangan berkecil hati, mari kita perbaiki bersama bagian materi yang masih belum dipahami."
                        : score <= 70
                        ? "Usahamu sudah terlihat baik, sedikit lagi kamu bisa mencapai hasil yang jauh lebih maksimal."
                        : "Luar biasa! Pemahamanmu terhadap materi sangat baik, teruslah kembangkan potensimu lebih jauh lagi."}"
                    </div>

                    <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
                      <div className="text-left space-y-1">
                        <p className="text-slate-500">Ditetapkan di: Sekolah</p>
                        <p className="text-slate-500">Tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-center space-y-8">
                        <p className="font-bold text-slate-800">Guru Pengampu PJOK</p>
                        <p className="font-bold text-emerald-700 underline">WAHYU WIDI SAPUTRA, S.Pd</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => {
                        playSound('click', audioMuted);
                        window.print();
                      }}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-file-pdf"></i> Cetak / Unduh Sertifikat PDF
                    </button>
                    <button
                      onClick={() => {
                        playSound('click', audioMuted);
                        setQuizStarted(false);
                        setQuizLevel(null);
                        setQuizCompleted(false);
                      }}
                      className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs transition-all cursor-pointer"
                    >
                      Ulangi Kuis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 7. MINI GAMES EDUKATIF ==================== */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-puzzle-piece"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Mini Games Edukatif Sepak Bola</h2>
                  <p className="text-xs text-slate-500">Tantangan pencocokan gerakan dan strategi permainan invasi</p>
                </div>
              </div>

              {!gameFinished ? (
                <div className="space-y-6 max-w-xl mx-auto py-2">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                      Tantangan {gameStep + 1} dari {gameChallenges.length}
                    </span>
                    <span className="text-xs font-bold text-slate-600">Skor: {gameScore}</span>
                  </div>

                  <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-200 space-y-3 text-center">
                    <h3 className="font-display font-bold text-indigo-900 text-lg">
                      {gameChallenges[gameStep].prompt}
                    </h3>
                    <p className="text-xs text-indigo-700 font-medium">
                      💡 Petunjuk: {gameChallenges[gameStep].hint}
                    </p>
                  </div>

                  {gameFeedback && (
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold text-center animate-bounce">
                      {gameFeedback}
                    </div>
                  )}

                  <div className="space-y-3">
                    {gameChallenges[gameStep].options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleGameAnswer(idx)}
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 font-display font-bold text-slate-800 text-sm shadow-sm transition-all text-left flex items-center justify-between cursor-pointer"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-4 h-4 text-indigo-600" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-md mx-auto py-8 text-center animate-fadeIn">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-600 text-white mx-auto flex items-center justify-center text-3xl shadow-xl">
                    🌟
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-display font-bold text-slate-800">Mini Game Selesai!</h3>
                    <p className="text-xs text-slate-500">Kamu berhasil mencocokkan seluruh gerakan sepak bola dengan tepat.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-900 font-display font-bold text-xl">
                    Skor Akhir: {gameScore} Poin
                  </div>
                  <button
                    onClick={() => {
                      playSound('click', audioMuted);
                      setGameStep(0);
                      setGameScore(0);
                      setGameFinished(false);
                    }}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Mainkan Lagi
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 8. KESIMPULAN ==================== */}
        {activeTab === 'kesimpulan' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-clipboard-check"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Kesimpulan Pembelajaran</h2>
                  <p className="text-xs text-slate-500">Rangkuman materi permainan invasi sepak bola kelas V SD</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: '1. Hakikat Permainan Invasi',
                    desc: 'Sepak bola adalah permainan bola besar beregu yang menuntut kerja sama dan kemampuan menginvasi daerah pertahanan lawan untuk mencetak skor.'
                  },
                  {
                    title: '2. Variasi Passing & Dribbling',
                    desc: 'Passing (mengoper dengan kaki bagian dalam/luar) dan dribbling (menggiring bola zig-zag) adalah senjata utama dalam membangun serangan yang efektif.'
                  },
                  {
                    title: '3. Analisis Gerak Kompleks',
                    desc: 'Setiap aksi melibatkan gerak lokomotor (berlari), non-lokomotor (meliukkan badan), dan manipulatif (menendang & menguasai bola) yang harmonis.'
                  },
                  {
                    title: '4. Pengembangan Karakter',
                    desc: 'Selain kesehatan fisik, bermain sepak bola melatih sportivitas, gotong royong, kedisiplinan, dan pemecahan masalah secara taktis.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1">
                    <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed pl-6">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { playSound('click', audioMuted); setActiveTab('refleksi'); }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Lanjut ke Papan Refleksi <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 9. PAPAN REFLEKSI KOLABORATIF ==================== */}
        {activeTab === 'refleksi' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Papan Refleksi Kolaboratif</h2>
                  <p className="text-xs text-slate-500">Jurnal refleksi digital dan sticky notes siswa (Shaka & Haflasea)</p>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={saveReflection} className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-4">
                <h3 className="font-display font-bold text-amber-900 text-base">Tuliskan Refleksi Belajarmu Hari Ini</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Siswa</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Contoh: Shaka atau Haflasea"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-amber-500 focus:outline-none text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Perasaan / Kesan</label>
                    <select
                      value={newFeeling}
                      onChange={(e) => setNewFeeling(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-amber-500 focus:outline-none text-xs font-medium"
                    >
                      <option value="Sangat Senang 😊">Sangat Senang 😊</option>
                      <option value="Antusias 🌟">Antusias 🌟</option>
                      <option value="Paham & Seru ⚽">Paham & Seru ⚽</option>
                      <option value="Tertantang 💪">Tertantang 💪</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pesan & Refleksi Singkat</label>
                  <textarea
                    required
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Apa hal paling berkesan dari belajar sepak bola hari ini?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-amber-500 focus:outline-none text-xs font-medium resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Tempelkan Sticky Note
                  </button>
                </div>
              </form>

              {/* Sticky Notes Grid */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-slate-800 text-base">Sticky Notes Papan Refleksi Kelas</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reflections.map((ref) => (
                    <div
                      key={ref.id}
                      className={`p-5 rounded-2xl border-2 ${ref.color} shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm">{ref.name}</span>
                          <span className="text-[10px] opacity-75 font-semibold">{ref.date}</span>
                        </div>
                        <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/60 inline-block">
                          {ref.feeling}
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">
                          "{ref.message}"
                        </p>
                      </div>
                      <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[10px] opacity-60">
                        <span>Papan Kolaborasi PJOK</span>
                        <span>#KelasV</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-emerald-100 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <p>Media Pembelajaran Interaktif PJOK Kelas V SD • Permainan Invasi (Sepak Bola) • Kurikulum Merdeka</p>
        <p className="mt-1 text-[11px] text-slate-400">Dirancang khusus dengan pendekatan pembelajaran berdiferensiasi, Deep Learning, & Gamifikasi.</p>
      </footer>
    </div>
  );
}
