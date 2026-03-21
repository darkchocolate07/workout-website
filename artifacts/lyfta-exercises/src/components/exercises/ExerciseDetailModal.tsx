import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Dumbbell, Activity, Edit2, Trash2 } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";
import { useDeleteExercise } from "@/hooks/use-exercises";
import { useToast } from "@/hooks/use-toast";

interface Props {
  exercise: Exercise | null;
  onClose: () => void;
  onEdit: (ex: Exercise) => void;
}

export function ExerciseDetailModal({ exercise, onClose, onEdit }: Props) {
  const { toast } = useToast();
  const deleteMutation = useDeleteExercise();

  if (!exercise) return null;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this exercise?")) {
      deleteMutation.mutate(exercise.id, {
        onSuccess: () => {
          toast({ title: "Deleted", description: "Exercise removed from library." });
          onClose();
        },
        onError: (err) => {
          toast({ title: "API Endpoint Missing", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image/Video */}
          <div className="w-full md:w-1/2 bg-black/50 p-8 flex items-center justify-center border-r border-white/5 relative group">
            {exercise.gifUrl ? (
              <img 
                src={exercise.gifUrl} 
                alt={exercise.name} 
                className="w-full h-auto max-h-[400px] object-contain rounded-xl mix-blend-screen opacity-90"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center text-white/20">
                <Dumbbell className="w-16 h-16 mb-4 opacity-50" />
                <p>No preview available</p>
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(exercise)} className="p-2 bg-black/80 rounded-lg text-white hover:text-primary transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 bg-black/80 rounded-lg text-white hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Details */}
          <div className="w-full md:w-1/2 p-8 lg:p-10 flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="mb-8">
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-white/10 text-white/80">
                  {exercise.bodyPart}
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-display font-bold text-white capitalize leading-tight">
                {exercise.name}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Target</span>
                </div>
                <span className="text-lg font-medium text-white capitalize">{exercise.target}</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-400">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Equipment</span>
                </div>
                <span className="text-lg font-medium text-white capitalize">{exercise.equipment}</span>
              </div>
            </div>

            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 text-white/50 mb-3">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Secondary Muscles</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.secondaryMuscles.map(muscle => (
                    <span key={muscle} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-white/10 text-white/70 capitalize">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.instructions && exercise.instructions.length > 0 && (
              <div className="flex-1">
                <h3 className="text-xl font-display font-bold mb-4 text-white">Instructions</h3>
                <ol className="space-y-4">
                  {exercise.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </span>
                      <p className="text-white/70 leading-relaxed pt-1">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
