import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

const photos = [
  { id: 1, src: '/photo1.jpg', title: 'Memory 1' },
  { id: 2, src: '/photo2.jpg', title: 'Memory 2' },
  { id: 3, src: '/photo3.jpg', title: 'Memory 3' },
  { id: 4, src: '/photo4.jpg', title: 'Memory 4' },
  { id: 5, src: '/photo5.jpg', title: 'Memory 5' },
];

function PhotoCard({ photo, index, total, scrollYProgress, onSelect }) {
  const step = 0.8 / total;
  const duration = 1.0 / total;
  const frontStart = index * step;
  const frontEnd = frontStart + duration;
  const inStart = Math.max(0, frontStart - 0.05);
  const inEnd = Math.min(1, frontStart + 0.05);
  const outStart = Math.max(0, frontEnd - 0.05);
  const outEnd = Math.min(1, frontEnd + 0.1);

  const z = useTransform(scrollYProgress, [inStart, inEnd, outStart, outEnd], [-500, 0, 0, 200]);
  const opacity = useTransform(scrollYProgress, [inStart, inEnd, outStart, outEnd], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [inStart, inEnd, outStart, outEnd], ['-20%', '0%', '0%', '40%']);
  const rotateX = useTransform(scrollYProgress, [inStart, inEnd, outStart, outEnd], [15, 0, 0, -10]);
  const scale = useTransform(scrollYProgress, [inStart, inEnd, outStart, outEnd], [0.8, 1, 1, 0.9]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        z,
        opacity,
        y,
        rotateX,
        scale,
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
      }}
    >
      <div
        className="relative w-[60%] max-w-[400px] h-[80%] max-h-[600px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
        style={{
          backgroundImage: `url(${photo.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pointerEvents: 'auto',
          transformStyle: 'preserve-3d',
        }}
        onClick={() => onSelect(photo)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h2 className="text-2xl font-bold drop-shadow-lg">{photo.title}</h2>
        </div>
      </div>
    </motion.div>
  );
}

export default function PhotoGallery({ onBack }) {
  const containerRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto relative bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50"
    >
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm text-gray-700 hover:text-pink-600 px-4 py-2 rounded-full shadow-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Kembali</span>
      </button>

      <div className="h-[400vh] relative">
        <div
          className="sticky top-0 h-[calc(100vh-88px)] w-full flex items-center justify-center"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          {photos.map((photo, index) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              total={photos.length}
              scrollYProgress={scrollYProgress}
              onSelect={setSelectedPhoto}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 text-white hover:text-pink-400 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                className="w-full h-auto object-contain rounded-2xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
