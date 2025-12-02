import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './HomePage.css';

const FEATURED_CATEGORIES = [
  { name: 'Trending Now', icon: '🔥', query: 'trending movies and shows' },
  { name: 'Top Rated', icon: '⭐', query: 'top rated content' },
  { name: 'New Releases', icon: '🎬', query: 'new releases this month' },
  { name: 'Hidden Gems', icon: '💎', query: 'underrated hidden gems' },
];

const MOOD_CATEGORIES = [
  { name: 'Feel Good', emoji: '😊', query: 'feel good uplifting movies' },
  { name: 'Thrilling', emoji: '😱', query: 'suspenseful thriller movies' },
  { name: 'Thoughtful', emoji: '🤔', query: 'thought-provoking deep films' },
  { name: 'Adventurous', emoji: '🗺️', query: 'exciting adventure movies' },
];

export function HomePage() {
  const navigate = useNavigate();

  const handleCategoryClick = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <motion.div
          className="home-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="home-hero-title">
            Discover Your Next Favorite
            <br />
            <span className="home-hero-gradient">In a Whole New Way</span>
          </h1>
          <p className="home-hero-subtitle">
            Explore movies and TV shows through an interactive visual map.
            <br />
            Find connections, discover patterns, and experience content discovery like never before.
          </p>
          <div className="home-hero-actions">
            <button
              className="home-hero-button home-hero-button--primary"
              onClick={() => navigate('/search')}
            >
              Start Exploring
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h12m-6-6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="home-hero-button home-hero-button--secondary"
              onClick={() => navigate('/onboarding')}
            >
              Take a Tour
            </button>
          </div>
        </motion.div>

        <motion.div
          className="home-hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <svg viewBox="0 0 400 400" className="home-hero-graph">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Sample graph visualization */}
            <line x1="200" y1="200" x2="300" y2="150" stroke="url(#grad1)" strokeWidth="2" opacity="0.3" />
            <line x1="200" y1="200" x2="100" y2="150" stroke="url(#grad1)" strokeWidth="2" opacity="0.3" />
            <line x1="200" y1="200" x2="250" y2="300" stroke="url(#grad2)" strokeWidth="2" opacity="0.3" />
            <line x1="200" y1="200" x2="150" y2="300" stroke="url(#grad2)" strokeWidth="2" opacity="0.3" />
            <circle cx="200" cy="200" r="30" fill="url(#grad1)" />
            <circle cx="300" cy="150" r="20" fill="url(#grad2)" />
            <circle cx="100" cy="150" r="20" fill="url(#grad1)" />
            <circle cx="250" cy="300" r="20" fill="url(#grad2)" />
            <circle cx="150" cy="300" r="20" fill="url(#grad1)" />
          </svg>
        </motion.div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">Browse by Category</h2>
        <div className="home-categories">
          {FEATURED_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.name}
              className="home-category"
              onClick={() => handleCategoryClick(category.query)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="home-category-icon">{category.icon}</span>
              <span className="home-category-name">{category.name}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">Find by Mood</h2>
        <div className="home-moods">
          {MOOD_CATEGORIES.map((mood, index) => (
            <motion.button
              key={mood.name}
              className="home-mood"
              onClick={() => handleCategoryClick(mood.query)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="home-mood-emoji">{mood.emoji}</span>
              <span className="home-mood-name">{mood.name}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="home-section home-features">
        <h2 className="home-section-title">Why Visual Discovery?</h2>
        <div className="home-features-grid">
          <motion.div
            className="home-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="home-feature-icon">🗺️</div>
            <h3>See Connections</h3>
            <p>Discover how movies and shows relate through shared themes, genres, and moods</p>
          </motion.div>
          <motion.div
            className="home-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="home-feature-icon">🎯</div>
            <h3>Find Patterns</h3>
            <p>Explore clusters of similar content and uncover hidden gems you'll love</p>
          </motion.div>
          <motion.div
            className="home-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="home-feature-icon">⚡</div>
            <h3>Instant Results</h3>
            <p>Navigate through recommendations visually for faster, more intuitive discovery</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
