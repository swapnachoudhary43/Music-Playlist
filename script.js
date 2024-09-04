// public/script.js
document.getElementById('generateBtn').addEventListener('click', async () => {
    const genreSelect = document.getElementById('genre');
    const moodSelect = document.getElementById('mood');
    const playlistDiv = document.getElementById('playlist');

    const genre = genreSelect.value;
    const mood = moodSelect.value;

    if (!genre || !mood) {
        alert('Please select both genre and mood.');
        return;
    }

    playlistDiv.innerHTML = '<p>Loading...</p>';

    try {
        const response = await fetch('/generate-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ genre, mood })
        });

        const data = await response.json();

        if (response.ok) {
            const { playlist } = data;
            if (playlist.length === 0) {
                playlistDiv.innerHTML = '<p>No tracks found for the selected genre and mood.</p>';
                return;
            }

            playlistDiv.innerHTML = '';
            playlist.forEach(track => {
                const trackDiv = document.createElement('div');
                trackDiv.className = 'track';

                const img = document.createElement('img');
                img.src = track.cover;
                img.alt = `${track.title} cover`;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'track-info';

                const title = document.createElement('p');
                title.className = 'track-title';
                const link = document.createElement('a');
                link.href = track.url;
                link.target = '_blank';
                link.textContent = track.title;
                title.appendChild(link);

                const artist = document.createElement('p');
                artist.className = 'track-artist';
                artist.textContent = track.artist;

                infoDiv.appendChild(title);
                infoDiv.appendChild(artist);

                trackDiv.appendChild(img);
                trackDiv.appendChild(infoDiv);

                playlistDiv.appendChild(trackDiv);
            });
        } else {
            playlistDiv.innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error fetching playlist:', error);
        playlistDiv.innerHTML = '<p>An error occurred while generating the playlist.</p>';
    }
});
