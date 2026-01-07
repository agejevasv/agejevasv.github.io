/*

Audio, waveform pngs and durations:

for f in *.wav *.mp3 *.ogg *.flac; do
  [ -f "$f" ] || continue
  ffmpeg -i "$f" -af "adelay=500:all=1" -b:a 320k -dash 1 "${f%.*}.webm" -y
done

for f in music/webm/*.webm; do
  name=$(basename "$f" .webm)
  ffmpeg -i "$f" -filter_complex "showwavespic=s=1600x200:colors=#6366f1" -y "/tmp/${name}.png"
  convert "/tmp/${name}.png" -trim -resize 1600x120\! "music/waveforms/${name}.png"
done

for f in music/webm/*.webm; do
  name=$(basename "$f" .webm)
  title=$(echo "$name" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  mins=$(echo "$dur" | awk '{m=int($1/60); s=int($1%60); printf "%d:%02d", m, s}')
  echo "- [$title](music/webm/$name.webm) $mins"
done

*/
class MusicPlayer {
    constructor(trackList) {
        this.trackList = trackList;
        this.trackList.id = 'track-list';
        this.tracks = trackList.querySelectorAll('li');
        this.currentSound = null;
        this.currentTrack = null;
        this.isPlaying = false;

        this.createPlayer();
        this.addTrackNumbers();
        this.addDurations();
        this.bindEvents();
    }

    createPlayer() {
        this.player = document.createElement('div');
        this.player.id = 'music-player';
        this.player.innerHTML = `
            <div id="now-playing-row">
                <div id="now-playing"></div>
                <span id="time-display"></span>
            </div>
            <div id="player-controls">
                <button id="play-btn">▶</button>
                <div id="progress-container"><div id="progress-bar"></div></div>
            </div>
        `;
        this.trackList.parentNode.insertBefore(this.player, this.trackList);
        this.player.appendChild(this.trackList);

        this.playBtn = document.getElementById('play-btn');
        this.nowPlaying = document.getElementById('now-playing');
        this.progressBar = document.getElementById('progress-bar');
        this.progressContainer = document.getElementById('progress-container');
        this.timeDisplay = document.getElementById('time-display');
    }

    bindEvents() {
        this.tracks.forEach(li => li.addEventListener('click', e => {
            e.preventDefault();
            this.loadTrack(li);
            this.currentSound?.play();
        }));

        this.playBtn.addEventListener('click', () => {
            if (!this.currentSound) this.loadTrack(this.tracks[0]);
            this.currentSound.playing() ? this.currentSound.pause() : this.currentSound.play();
        });

        this.progressContainer.addEventListener('click', e => this.seek(e.clientX));
        this.progressContainer.addEventListener('touchend', e => {
            e.preventDefault();
            this.seek(e.changedTouches[0].clientX);
        });
    }

    loadTrack(li) {
        if (this.currentSound) this.currentSound.unload();
        this.tracks.forEach(t => t.classList.remove('active'));
        li.classList.add('active');
        this.currentTrack = li;

        const link = li.querySelector('a');
        if (!link) return;

        this.nowPlaying.textContent = link.textContent;
        const trackName = link.href.split('/').pop().replace('.webm', '');
        this.progressContainer.style.backgroundImage = `url(/music/waveforms/${trackName}.png)`;
        this.currentSound = new window.Howl({
            src: [link.href],
            format: ['webm'],
            html5: true,
            onplay: () => this.setPlaying(true),
            onpause: () => this.setPlaying(false),
            onend: () => {
                this.setPlaying(false);
                this.progressBar.style.width = '0%';
                if (this.currentTrack.nextElementSibling) {
                    this.loadTrack(this.currentTrack.nextElementSibling);
                    this.currentSound.play();
                }
            },
            onload: () => {
                this.timeDisplay.textContent = `0:00 / ${this.formatTime(this.currentSound.duration())}`;
            }
        });
    }

    setPlaying(playing) {
        this.isPlaying = playing;
        this.playBtn.textContent = playing ? '❚❚' : '▶';
        this.player.classList.toggle('playing', playing);
        if (playing) this.updateProgress();
    }

    updateProgress() {
        if (this.currentSound && this.isPlaying) {
            this.updateDisplay();
            requestAnimationFrame(() => this.updateProgress());
        }
    }

    updateDisplay() {
        const pos = this.currentSound.seek();
        const dur = this.currentSound.duration();
        this.progressBar.style.width = (pos / dur * 100) + '%';
        this.timeDisplay.textContent = `${this.formatTime(pos)} / ${this.formatTime(dur)}`;
    }

    seek(clientX) {
        if (!this.currentSound) return;
        const rect = this.progressContainer.getBoundingClientRect();
        const pct = (clientX - rect.left) / this.progressContainer.offsetWidth;
        this.currentSound.seek(pct * this.currentSound.duration());
        this.updateDisplay();
        if (this.isPlaying) this.updateProgress();
    }

    formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    addTrackNumbers() {
        this.tracks.forEach((li, i) => {
            const num = document.createElement('span');
            num.className = 'track-number';
            num.textContent = String(i + 1).padStart(2, '0');
            li.insertBefore(num, li.firstChild);
        });
    }

    addDurations() {
        this.tracks.forEach(li => {
            const link = li.querySelector('a');
            if (!link) return;

            const text = li.textContent;
            const match = text.match(/(\d+:\d+)$/);
            if (match) {
                link.nextSibling?.remove();
                const duration = document.createElement('span');
                duration.className = 'track-duration';
                duration.textContent = match[1];
                li.appendChild(duration);
            }
        });
    }
}

function loadHowlerAndInit(trackList) {
    if (window.Howl) {
        new MusicPlayer(trackList);
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js';
        script.onload = () => new MusicPlayer(trackList);
        document.head.appendChild(script);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const trackList = document.querySelector('ul:has(a[href$=".webm"])');
    if (trackList) {
        loadHowlerAndInit(trackList);
    }
});
