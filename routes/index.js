import express from 'express';
import axios from 'axios';

const router = express.Router();

// Home page renders index.ejs
router.get('/', (req, res) => {
    const lang = req.query.lang || 'en';
    res.render('pages/index', { mangas: null, lang });
    });

// Search for manga
router.get('/search', async (req, res) => {
    const title = req.query.title;
    const lang = req.query.lang || 'en';
    try {
        const response = await axios.get(`https://api.mangadex.org/manga`, {
            params: {
                title: title,
                limit: 10,
            },
        });

        const mangaList = response.data.data;
        const mangaWithCovers= await Promise.all(
            mangaList.map(async (manga) => {
                const mangaId = manga.id;

                const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
                
                let coverUrl = null;
                if (coverRel) {
                    const coverId = coverRel.id;
                    const coverRes = await axios.get( `https://api.mangadex.org/cover/${coverId}`);
                    const fileName = coverRes.data.data.attributes.fileName;
                    coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`;
                }
                 return {
          id: mangaId,
          title: manga.attributes.title.en,
          coverUrl,
        };
      }));

        
        res.render('pages/search', { 
          mangas: mangaWithCovers,
          lang
         }); //It renders the pages/search.ejs with manga data
    } catch (error) {
        console.error(error);
        res.render('pages/search', { mangas: [], lang}); // If there's an error, renders with an empty manga list
    }
});



// Manga details page after clicking on title from search results
router.get('/manga/:id', async (req, res) => {
  const mangaId = req.params.id;
  const lang = req.query.lang || 'en'; // Default to English if no language is specified



  const languageMap = {
    en: 'English',
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    ko: 'Korean',
    zh: 'Chinese',
    pt: 'Portuguese',
    id: 'Indonesian',
    de: 'German'
  };
  const langName = languageMap[lang] || lang; // fallback to code if unknown


  try {
    // Fetch manga info + cover relationship
    const { data: mangaData } = await axios.get(
      `https://api.mangadex.org/manga/${mangaId}`,
      { params: { includes: ['cover_art'] } }
    );

    // Get cover art file name
    const relationships = mangaData.data.relationships;
    const coverRel = relationships.find(rel => rel.type === 'cover_art');
    const fileName = coverRel?.attributes?.fileName;
    const coverUrl = fileName
      ? `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`
      : null;

    // Fetch chapters
      const { data: chapterData } = await axios.get(`https://api.mangadex.org/chapter`, {
      params: {
        manga: mangaId,
        translatedLanguage: [lang],
        order: { chapter: 'asc' },
        limit: 100
      }
    });

    // Filter and map readable chapters
    const readableChapters = chapterData.data
      .filter(chap => {
        const attrs = chap.attributes;
        return (
          attrs?.pages > 0 &&
          attrs?.translatedLanguage === lang &&
          chap.id
        );
      })
      .map(chap => ({
        id: chap.id,
        number: chap.attributes.chapter,
        title: chap.attributes.title || `Chapter ${chap.attributes.chapter || 'N/A'}`
      }));


    // Render page
    res.render('pages/manga-details', {
      manga: mangaData.data,
      coverUrl,
      chapters: readableChapters,
      lang: req.query.lang || 'en'
    });

  } catch (err) {
    console.error('Error loading manga details:', err.response?.data || err.message);
    res.send('Error loading manga details.');
  }
});


router.get('/read/:chapterId', async (req, res) => {
    const chapterId = req.params.chapterId;
    try {
        const { data: chapterData } = await axios.get(`https://api.mangadex.org/at-home/server/${chapterId}`);
        const baseUrl = chapterData.baseUrl;
        const chapter = chapterData.chapter;

        // Check if chapter data is valid
        if (!chapter || !chapter.data || chapter.data.length === 0) {
            return res.send('⚠️ No pages found for this chapter.');
        }

        // Build page image URLs
        const pageUrls = chapter.data.map(page =>
            `${baseUrl}/data/${chapter.hash}/${page}`);
        
        console.log('Page URLs:', pageUrls);
        res.render('pages/reader', {
            pages: pageUrls
        });

        
    } catch (err) {
        console.error('❌ Error loading chapter:', err.response?.data || err.message);
        res.send('❌ Failed to load chapter.');
    }
});





export default router;