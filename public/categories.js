'use strict';
const genreThemes=[
['Best Sellers','Best Sellers','The books our readers keep coming back to.','#3e3128'],
['Art Design Music and Photography','Art, Design & Photography','See the world differently.','#554638'],
['Biography and Memoir','Biography & Memoir','Extraordinary lives. Real stories.','#413b39'],
['Business Finance and Economics','Business & Finance','Ideas for a bigger picture.','#3f2d22'],
['Children and Young Readers','Children & Young Readers','Big adventures for little minds.','#655224'],
['Classic Literature','Classic Literature','Great stories, beyond their time.','#403e28'],
['Comics Manga and Graphic Novels','Comics, Manga & Graphic Novels','Stories that leap off the page.','#49374f'],
['Cooking Food and Drink','Cooking, Food & Drink','A little inspiration for the table.','#4d432e'],
['Engineering Computing and Technology','Computing & Technology','Discover how things work.','#4d3221'],
['Fantasy','Fantasy','Step into another world.','#3d2f26'],
['General Fiction and Literature','Fiction & Literature','Every page, a new possibility.','#4a3a2d'],
['General Reference and Study','Reference & Study','Keep your curiosity growing.','#4a423d'],
['History Politics and Society','History, Politics & Society','The past. The present. The bigger picture.','#4d3c30'],
['Horror','Horror','For stories that linger after dark.','#332635'],
['Language Learning and Exam Preparation','Languages & Exam Preparation','Open a door to new possibilities.','#503d31'],
['Medicine Health and Nursing','Medicine, Health & Nursing','Explore the science of care.','#503c2f'],
['Mystery Crime and Thrillers','Mystery, Crime & Thrillers','One more clue. One more chapter.','#3c332d'],
['Other and Unspecified Genres','More to Discover','Find something unexpected.','#45413b'],
['Philosophy','Philosophy','Make room for deeper questions.','#443d33'],
['Poetry','Poetry','A few words. A whole world.','#4b3e48'],
['Religion and Spirituality','Religion & Spirituality','Read, reflect, and reconnect.','#463a32'],
['Romance','Romance','Stories with a little heart.','#69444a'],
['Science Fiction','Science Fiction','Imagine what lies beyond.','#503829'],
['Science Mathematics and Nature','Science, Mathematics & Nature','Wonder at the world around you.','#463428'],
['Self Help Psychology and Personal Development','Self-Help & Psychology','A fresh perspective starts here.','#504035'],
['Short Stories','Short Stories','Small stories. Lasting impressions.','#5b4437'],
['Travel Sports Gardening and Lifestyle','Travel & Lifestyle','Inspiration for everyday adventures.','#514239']
];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadGenres(){try{const response=await fetch('/api/catalogue',{cache:'no-store'});if(!response.ok)throw Error('Catalogue unavailable');const books=await response.json();const groups=new Map();for(const book of books){if(!groups.has(book.genre))groups.set(book.genre,[]);groups.get(book.genre).push(book)}groups.set('Best Sellers',books.filter(b=>b.bestSeller));for(const genre of groups.keys())if(!genreThemes.some(t=>t[0]===genre))genreThemes.push([genre,genre,'Discover your next read.','#543b29']);document.querySelector('#genreSummary').textContent=`${groups.size} genres · ${books.length.toLocaleString()} books`;document.querySelector('#allGenreCards').innerHTML=genreThemes.filter(([genre])=>groups.get(genre)?.length).map(([genre,title,description,color],index)=>{const group=groups.get(genre);const choices=group.filter(b=>b.image);const images=[choices[0],choices[Math.floor(choices.length*.42)],choices[Math.floor(choices.length*.74)]];return `<a class="genre-tile" href="${genre==='Best Sellers'?'/best-sellers':'/books?genre='+encodeURIComponent(genre)+'#collection'}" style="--genre-color:${color}" aria-label="Browse ${escapeHtml(title)}, ${group.length.toLocaleString()} books"><img class="genre-backdrop" src="/${images[1].image}" alt="" loading="lazy"><span class="genre-shade"></span><div class="genre-book-scene" aria-hidden="true">${images.map((book,i)=>`<img class="scene-book scene-book-${i}" src="/${book.image}" alt="" loading="lazy">`).join('')}</div><div class="genre-tile-copy"><span class="genre-number">${String(index+1).padStart(2,'0')} / NAGI COLLECTION</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><span class="genre-count">${group.length.toLocaleString()} BOOKS</span></div></a>`}).join('')}catch(error){document.querySelector('#allGenreCards').innerHTML='<p>Categories could not load. Please refresh to try again.</p>';console.error(error)}}loadGenres();
