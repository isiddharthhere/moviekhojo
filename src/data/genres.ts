export interface GenreNode {
  id: string;
  label: string;
  subGenres?: { id: string; label: string }[];
}

export const GENRE_ONTOLOGY: GenreNode[] = [
  {
    id: 'action',
    label: 'Action',
    subGenres: [
      { id: 'martial-arts', label: 'Martial Arts' },
      { id: 'military-war', label: 'Military / War' },
      { id: 'spy-espionage', label: 'Spy / Espionage' },
      { id: 'heist', label: 'Heist' },
      { id: 'survival', label: 'Survival' },
      { id: 'superhero', label: 'Superhero' },
      { id: 'scifi-action', label: 'Sci-Fi Action' },
      { id: 'car-chases', label: 'Car Chases' },
      { id: 'cyberpunk-action', label: 'Cyberpunk Action' },
    ],
  },
  {
    id: 'thriller',
    label: 'Thriller',
    subGenres: [
      { id: 'psychological-thriller', label: 'Psychological' },
      { id: 'crime-thriller', label: 'Crime Thriller' },
      { id: 'scifi-thriller', label: 'Sci-Fi Thriller' },
      { id: 'mystery-thriller', label: 'Mystery Thriller' },
      { id: 'techno-thriller', label: 'Techno-Thriller' },
      { id: 'political-thriller', label: 'Political' },
      { id: 'erotic-thriller', label: 'Erotic Thriller' },
      { id: 'psychological-suspense', label: 'Psychological Suspense' },
    ],
  },
  {
    id: 'horror',
    label: 'Horror',
    subGenres: [
      { id: 'supernatural', label: 'Supernatural' },
      { id: 'psychological-horror', label: 'Psychological Horror' },
      { id: 'slasher', label: 'Slasher' },
      { id: 'monster-creature', label: 'Monster / Creature' },
      { id: 'zombie', label: 'Zombie' },
      { id: 'found-footage', label: 'Found Footage' },
      { id: 'gore-splatter', label: 'Gore / Splatter' },
      { id: 'cosmic-horror', label: 'Cosmic Horror' },
      { id: 'folk-horror', label: 'Folk Horror' },
    ],
  },
  {
    id: 'crime',
    label: 'Crime',
    subGenres: [
      { id: 'gangster-mafia', label: 'Gangster / Mafia' },
      { id: 'detective-neo-noir', label: 'Detective / Neo-Noir' },
      { id: 'true-crime', label: 'True Crime' },
      { id: 'police-procedural', label: 'Police Procedural' },
      { id: 'legal-courtroom', label: 'Legal / Courtroom' },
      { id: 'white-collar', label: 'White Collar' },
      { id: 'whodunit', label: 'Whodunit' },
    ],
  },
  {
    id: 'scifi-fantasy',
    label: 'Sci-Fi & Fantasy',
    subGenres: [
      { id: 'space-opera', label: 'Space Opera' },
      { id: 'time-travel', label: 'Time Travel' },
      { id: 'dystopian', label: 'Dystopian' },
      { id: 'dark-fantasy', label: 'Dark Fantasy' },
      { id: 'high-fantasy', label: 'High Fantasy' },
      { id: 'urban-fantasy', label: 'Urban Fantasy' },
      { id: 'isekai', label: 'Isekai' },
      { id: 'steampunk', label: 'Steampunk' },
      { id: 'post-apocalyptic', label: 'Post-Apocalyptic' },
    ],
  },
  {
    id: 'comedy',
    label: 'Comedy',
    subGenres: [
      { id: 'sitcom', label: 'Sitcom' },
      { id: 'dark-comedy', label: 'Dark Comedy' },
      { id: 'satire', label: 'Satire' },
      { id: 'slapstick', label: 'Slapstick' },
      { id: 'rom-com', label: 'Rom-Com' },
      { id: 'parody', label: 'Parody' },
      { id: 'black-humor', label: 'Black Humor' },
    ],
  },
  {
    id: 'drama',
    label: 'Drama',
    subGenres: [
      { id: 'period-historical', label: 'Period / Historical' },
      { id: 'melodrama', label: 'Melodrama' },
      { id: 'coming-of-age', label: 'Coming-of-Age' },
      { id: 'biographical', label: 'Biographical' },
      { id: 'family-drama', label: 'Family Drama' },
      { id: 'sports-drama', label: 'Sports Drama' },
      { id: 'medical-drama', label: 'Medical Drama' },
    ],
  },
  {
    id: 'romance',
    label: 'Romance',
    subGenres: [
      { id: 'slice-of-life', label: 'Slice-of-Life' },
      { id: 'slow-burn', label: 'Slow-Burn' },
      { id: 'forbidden-love', label: 'Forbidden Love' },
      { id: 'melodramatic-romance', label: 'Melodramatic Romance' },
      { id: 'workplace-romance', label: 'Workplace Romance' },
    ],
  },
  {
    id: 'documentary',
    label: 'Documentaries',
    subGenres: [
      { id: 'nature-wildlife', label: 'Nature / Wildlife' },
      { id: 'historical-doc', label: 'Historical' },
      { id: 'science-space', label: 'Science / Space' },
      { id: 'investigative', label: 'Investigative / Expose' },
      { id: 'biographies', label: 'Biographies' },
      { id: 'true-crime-doc', label: 'True Crime Doc' },
    ],
  },
];

export const CONTENT_TYPES = [
  { id: 'movie', label: 'Movie' },
  { id: 'web_series', label: 'Web Series' },
  { id: 'tv_show', label: 'TV Show' },
  { id: 'anime', label: 'Anime' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'kids_show', label: 'Kids Show' },
  { id: 'short_drama', label: 'Short Drama' },
];

export const LANGUAGE_OPTIONS = [
  { id: 'english', label: 'English (Original)' },
  { id: 'hindi_original', label: 'Hindi (Original)' },
  { id: 'hindi_dubbed', label: 'Hindi Dubbed' },
  { id: 'korean', label: 'Korean' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'french', label: 'French' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'bengali', label: 'Bengali' },
];

export const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular / Trending' },
  { id: 'new_releases', label: 'New Releases' },
  { id: 'vibe_match', label: 'Vibe Match' },
];
