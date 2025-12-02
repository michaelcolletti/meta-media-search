import { motion, AnimatePresence } from 'framer-motion';
import type { MediaContent } from '@types/index';
import { useAppStore } from '@store/index';
import './ContentDetailPanel.css';

interface ContentDetailPanelProps {
  content: MediaContent | null;
  onClose: () => void;
}

export function ContentDetailPanel({ content, onClose }: ContentDetailPanelProps) {
  const bookmarks = useAppStore(state => state.bookmarks);
  const addBookmark = useAppStore(state => state.addBookmark);
  const removeBookmark = useAppStore(state => state.removeBookmark);
  const addToWatchHistory = useAppStore(state => state.addToWatchHistory);

  if (!content) return null;

  const isBookmarked = bookmarks.includes(content.id);

  const handleBookmarkClick = () => {
    if (isBookmarked) {
      removeBookmark(content.id);
    } else {
      addBookmark(content.id);
    }
  };

  const handleWatchNow = (url: string) => {
    addToWatchHistory(content.id);
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {content && (
        <>
          <motion.div
            className="content-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="content-detail-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="content-detail-header">
              <button className="content-detail-close" onClick={onClose} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {content.backdrop && (
              <div className="content-detail-backdrop">
                <img src={content.backdrop} alt={content.title} />
                <div className="content-detail-backdrop-overlay" />
              </div>
            )}

            <div className="content-detail-body">
              <div className="content-detail-title-section">
                <h2 className="content-detail-title">{content.title}</h2>
                <div className="content-detail-meta">
                  <span className="content-detail-type">{content.type}</span>
                  {content.year && <span>{content.year}</span>}
                  {content.rating && (
                    <span className="content-detail-rating">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0l1.76 5.435h5.714l-4.624 3.36 1.76 5.435L8 10.87l-4.61 3.36 1.76-5.435-4.624-3.36h5.714L8 0z" />
                      </svg>
                      {content.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {content.description && (
                <div className="content-detail-section">
                  <h3>Overview</h3>
                  <p>{content.description}</p>
                </div>
              )}

              <div className="content-detail-section">
                <h3>Genres</h3>
                <div className="content-detail-genres">
                  {content.genres.map(genre => (
                    <span key={genre} className="content-detail-genre">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {content.mood && content.mood.length > 0 && (
                <div className="content-detail-section">
                  <h3>Mood</h3>
                  <div className="content-detail-moods">
                    {content.mood.map(mood => (
                      <span key={mood} className="content-detail-mood">
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {content.platforms.length > 0 && (
                <div className="content-detail-section">
                  <h3>Where to Watch</h3>
                  <div className="content-detail-platforms">
                    {content.platforms.map((platform, index) => (
                      <button
                        key={index}
                        className="content-detail-platform"
                        onClick={() => handleWatchNow(platform.url)}
                      >
                        <span className="content-detail-platform-name">{platform.name}</span>
                        <span className="content-detail-platform-type">{platform.type}</span>
                        {platform.quality && (
                          <span className="content-detail-platform-quality">
                            {platform.quality}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="content-detail-actions">
                <button
                  className={`content-detail-action ${isBookmarked ? 'active' : ''}`}
                  onClick={handleBookmarkClick}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 3h10a2 2 0 0 1 2 2v14l-7-4-7 4V5a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill={isBookmarked ? 'currentColor' : 'none'}
                    />
                  </svg>
                  {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
