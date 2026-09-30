"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Sparkles } from "lucide-react";
import type { GameStatus } from "@planning-poker/shared";
import { cn } from "@/lib/cn";

const QUOTES_VOTING_IDLE = [
  "Chào mừng cả bàn! Hãy chọn lá bài ước lượng phù hợp nhất nhé ~",
  "Mời các quý anh chọn bài! Đừng nhìn trộm bài nhau nha 😉",
  "Lá bài nào sẽ là điểm story point hoàn hảo cho task này đây?",
];

const QUOTES_VOTING_ACTIVE = [
  "Rất nhanh tay! Đã có những lá bài đầu tiên được úp xuống bàn rồi ~",
  "Ai chưa chọn bài thì nhanh tay lên nào, cả bàn đang đợi bạn đấy!",
  "Cảm giác ván này sẽ có nhiều bất ngờ đây...",
];

const QUOTES_REVEALED_CONSENSUS = [
  "Tuyệt đỉnh! Cả team đồng thuận 100%, xuất sắc quá đi! 🎉🥂",
  "Consensus tuyệt đối! Không cần tranh cãi gì thêm cho task này nữa!",
  "Đồng lòng như thế này thì sprint tới chắc chắn về đích sớm rồi!",
];

const QUOTES_REVEALED_DISAGREEMENT = [
  "Ối chà, bài lệch nhau khá nhiều đấy! Mời hai đầu chiến tuyến lên tiếng nào 😉",
  "Người chọn thấp nhất và người chọn cao nhất, hãy bảo vệ quan điểm của mình nào!",
  "Mỗi người một ý rồi, cùng thảo luận để tìm ra con số hợp lý nhất nhé ~",
];

export function CasinoDealer({
  status,
  hasVotes,
  consensus = false,
  visible = true,
  onToggleVisible,
}: {
  status: GameStatus;
  hasVotes: boolean;
  consensus?: boolean;
  visible?: boolean;
  onToggleVisible?: () => void;
}) {
  const [clickCount, setClickCount] = useState(0);

  if (!visible) {
    return onToggleVisible ? (
      <button
        onClick={onToggleVisible}
        className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/60 px-3 py-1 text-xs font-semibold text-amber-300 shadow-md backdrop-blur-md transition-all hover:bg-black/80"
        title="Bật Dealer chia bài"
      >
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span>Gọi Dealer Scarlett</span>
      </button>
    ) : null;
  }

  // Determine dealer expression & message
  const isCelebrating = status === "revealed";
  const imageSrc = isCelebrating ? "/dealer_celebrating.jpg" : "/dealer.jpg";

  let dialogue = QUOTES_VOTING_IDLE[clickCount % QUOTES_VOTING_IDLE.length]!;
  if (status === "voting" && hasVotes) {
    dialogue = QUOTES_VOTING_ACTIVE[clickCount % QUOTES_VOTING_ACTIVE.length]!;
  } else if (status === "counting") {
    dialogue = "Các lá bài chuẩn bị được lật! Hãy nín thở nào... ✨";
  } else if (status === "revealed") {
    dialogue = consensus
      ? QUOTES_REVEALED_CONSENSUS[clickCount % QUOTES_REVEALED_CONSENSUS.length]!
      : QUOTES_REVEALED_DISAGREEMENT[clickCount % QUOTES_REVEALED_DISAGREEMENT.length]!;
  }

  return (
    <div className="relative z-20 flex flex-col items-center">
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dialogue}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 450, damping: 25 }}
          className="relative mb-2 max-w-[260px] sm:max-w-xs rounded-2xl border border-amber-300/40 bg-gradient-to-br from-black/85 to-stone-900/90 px-3.5 py-2 text-center text-xs font-medium text-amber-100 shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <p className="leading-snug drop-shadow-sm">{dialogue}</p>
          {/* Bubble tail pointing down */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-amber-300/40 bg-stone-900/90" />
        </motion.div>
      </AnimatePresence>

      {/* Dealer Portrait with Luxury Frame */}
      <div className="group relative">
        <motion.button
          type="button"
          onClick={() => setClickCount((c) => c + 1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/90 shadow-[0_0_25px_rgba(251,191,36,0.35),0_10px_20px_rgba(0,0,0,0.6)] ring-4 ring-black/60 transition-transform"
          title="Bấm vào Dealer Scarlett để trò chuyện!"
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="VIP Dealer Scarlett"
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
          />

          {/* Luxury gold rim shine */}
          <div className="pointer-events-none absolute inset-0 rounded-full border border-white/30" />
        </motion.button>

        {/* Dealer badge tag */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-950/90 via-black/90 to-amber-950/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 shadow-md backdrop-blur-md">
          <Sparkles className="h-2.5 w-2.5 text-amber-400" />
          <span>VIP SCARLETT</span>
        </div>
      </div>
    </div>
  );
}
