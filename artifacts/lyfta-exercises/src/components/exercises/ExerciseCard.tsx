import { motion } from "framer-motion";
import type { Exercise } from "@workspace/api-client-react";
import { Dumbbell, Target, Zap, Heart, Activity, Wind, ChevronUp, Circle, ArrowUpCircle } from "lucide-react";

const bodyPartColors: Record<string, string> = {
  back: "from-blue-900/60 to-blue-950",
  chest: "from-red-900/60 to-red-950",
  shoulders: "from-purple-900/60 to-purple-950",
  "upper arms": "from-orange-900/60 to-orange-950",
  "lower arms": "from-amber-900/60 to-amber-950",
  "upper legs": "from-green-900/60 to-green-950",
  "lower legs": "from-teal-900/60 to-teal-950",
  hips: "from-pink-900/60 to-pink-950",
  waist: "from-yellow-900/60 to-yellow-950",
  cardio: "from-sky-900/60 to-sky-950",
  neck: "from-indigo-900/60 to-indigo-950",
};

const bodyPartIcons: Record<string, React.ReactNode> = {
  back: <ArrowUpCircle className="w-14 h-14 text-blue-400/30" />,
  chest: <Heart className="w-14 h-14 text-red-400/30" />,
  shoulders: <Zap className="w-14 h-14 text-purple-400/30" />,
  "upper arms": <Dumbbell className="w-14 h-14 text-orange-400/30" />,
  "lower arms": <Activity className="w-14 h-14 text-amber-400/30" />,
  "upper legs": <ChevronUp className="w-14 h-14 text-green-400/30" />,
  "lower legs": <Circle className="w-14 h-14 text-teal-400/30" />,
  hips: <Target className="w-14 h-14 text-pink-400/30" />,
  waist: <Activity className="w-14 h-14 text-yellow-400/30" />,
  cardio: <Wind className="w-14 h-14 text-sky-400/30" />,
  neck: <Circle className="w-14 h-14 text-indigo-400/30" />,
};

interface Props {
  exercise: Exercise;
  onClick: (exercise: Exercise) => void;
  index: number;
}

export function ExerciseCard({ exercise, onClick, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      onClick={() => onClick(exercise)}
      className="group relative bg-card rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors duration-300 shadow-lg hover:shadow-primary/10"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity" />
      
      <div className={`aspect-[4/3] bg-gradient-to-br ${bodyPartColors[exercise.bodyPart] ?? "from-gray-900/60 to-gray-950"} p-4 flex items-center justify-center relative`}>
        {exercise.gifUrl ? (
          <img 
            src={exercise.gifUrl} 
            alt={exercise.name} 
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            className="w-full h-full object-contain mix-blend-screen opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            {bodyPartIcons[exercise.bodyPart] ?? <Dumbbell className="w-14 h-14 text-white/10" />}
          </div>
        )}
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10">
            {exercise.bodyPart}
          </span>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-primary/20 backdrop-blur-md text-primary border border-primary/20">
            {exercise.equipment}
          </span>
        </div>
      </div>

      <div className="relative z-20 p-5 pt-0 mt--4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="font-display font-bold text-lg text-white capitalize leading-tight mb-3 line-clamp-2">
          {exercise.name}
        </h3>
        
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Target className="w-4 h-4" />
          <span className="capitalize truncate">{exercise.target}</span>
        </div>
      </div>
    </motion.div>
  );
}
