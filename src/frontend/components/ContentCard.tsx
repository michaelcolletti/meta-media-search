import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MediaContent } from '@types/index';
import { useAppStore } from '@store/index';
import './ContentCard.css';

interface ContentCardProps {
  content: MediaContent;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export function ContentCard({ content, onClick, variant = 'default' }: ContentCardProps) {
  const [imageError, setImageError] = useState(false);
  const bookmarks = useAppStore(state => state.bookmarks);
  const addBookmark = useAppStore(state => state.addBookmark);
  const removeBookmark = useAppStore(state => state.removeBookmark);

  const isBookmarked = bookmarks.includes(content.id);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeBookmark(content.id);
    } else {
      addBookmark(content.id);
    }
  };

  return (
    <motion.div
      className={`content-card content-card--${variant}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="content-card-image">
        {!imageError && content.poster ? (
          <img src={content.poster} alt={content.title} onError={() => setImageError(true)} />
        ) : (
          <div className="content-card-placeholder">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="8" fill="currentColor" opacity="0.1" />
              <path
                d="M24 18v12m-6-6h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        <button
          className={`content-card-bookmark ${isBookmarked ? 'active' : ''}`}
          onClick={handleBookmarkClick}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 3h10a2 2 0 0 1 2 2v14l-7-4-7 4V5a2 2 0 0 1 2-2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={isBookmarked ? 'currentColor' : 'none'}
            />
          </svg>
        </button>
      </div>

      <div className="content-card-body">
        <h3 className="content-card-title">{content.title}</h3>

        <div className="content-card-meta">
          <span className="content-card-type">{content.type}</span>
          {content.year && <span className="content-card-year">{content.year}</span>}
          {content.rating && (
            <span className="content-card-rating">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 0l1.545 4.755h5l-4.045 2.94 1.545 4.755L7 9.51l-4.045 2.94 1.545-4.755L.455 4.755h5L7 0z" />
              </svg>
              {content.rating.toFixed(1)}
            </span>
          )}
        </div>

        {variant === 'detailed' && content.description && (
          <p className="content-card-description">{content.description}</p>
        )}

        <div className="content-card-genres">
          {content.genres.slice(0, 3).map(genre => (
            <span key={genre} className="content-card-genre">
              {genre}
            </span>
          ))}
        </div>

        {content.platforms.length > 0 && (
          <div className="content-card-platforms">
            {content.platforms.slice(0, 4).map((platform, index) => (
              <span key={index} className="content-card-platform" title={platform.name}>
                {platform.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
