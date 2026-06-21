document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshSpinner = document.getElementById('refresh-spinner');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const feedContainer = document.getElementById('feed-container');
    const feedStatus = document.getElementById('feed-status');
    
    // Tweet Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const charCountSpan = document.getElementById('char-count');
    
    let allReleases = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdateId = null;

    // Initialize application
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderFeed();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            renderFeed();
        });
    });

    closeDrawerBtn.addEventListener('click', closeTweetDrawer);
    
    tweetTextarea.addEventListener('input', updateCharCount);

    // Fetch release notes from backend
    async function fetchReleases() {
        showLoadingState();
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.status === 'success') {
                allReleases = processReleases(data.entries);
                feedStatus.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
                renderFeed();
            } else {
                showErrorState(data.message || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState('Network error. Please make sure the backend is running.');
        } finally {
            hideLoadingState();
        }
    }

    // Show spinner and shimmer cards
    function showLoadingState() {
        refreshBtn.classList.add('spinning');
        feedContainer.innerHTML = `
            <div class="shimmer-container">
                <div class="shimmer-card"></div>
                <div class="shimmer-card"></div>
                <div class="shimmer-card"></div>
            </div>
        `;
    }

    // Hide spinner
    function hideLoadingState() {
        refreshBtn.classList.remove('spinning');
    }

    // Show error message
    function showErrorState(message) {
        feedStatus.textContent = 'Sync failed';
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation text-deprecated"></i>
                <h3>Sync Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    // Process raw entries into individual update items
    function processReleases(entries) {
        const processed = [];
        const parser = new DOMParser();

        entries.forEach((entry, entryIndex) => {
            const doc = parser.parseFromString(entry.content, 'text/html');
            const headings = doc.querySelectorAll('h3');
            
            if (headings.length === 0) {
                // No subheadings, treat entire content as one update
                processed.push({
                    id: `${entry.id}-0`,
                    date: entry.title,
                    isoDate: entry.updated,
                    link: entry.link,
                    type: 'update',
                    badgeClass: 'badge-feature',
                    contentHtml: entry.content,
                    plainText: doc.body.textContent.trim()
                });
            } else {
                // Parse sections by <h3> tags
                headings.forEach((heading, idx) => {
                    const typeText = heading.textContent.toLowerCase();
                    let type = 'update';
                    let badgeClass = 'badge-feature';

                    if (typeText.includes('feature')) {
                        type = 'feature';
                        badgeClass = 'badge-feature';
                    } else if (typeText.includes('changed') || typeText.includes('change') || typeText.includes('fix')) {
                        type = 'changed';
                        badgeClass = 'badge-changed';
                    } else if (typeText.includes('deprecated')) {
                        type = 'deprecated';
                        badgeClass = 'badge-deprecated';
                    }

                    // Gather all sibling elements until the next h3
                    let sibling = heading.nextElementSibling;
                    const contentContainer = document.createElement('div');
                    
                    while (sibling && sibling.tagName !== 'H3') {
                        contentContainer.appendChild(sibling.cloneNode(true));
                        sibling = sibling.nextElementSibling;
                    }

                    processed.push({
                        id: `${entry.id}-${idx}`,
                        date: entry.title,
                        isoDate: entry.updated,
                        link: entry.link,
                        type: type,
                        badgeClass: badgeClass,
                        typeName: heading.textContent,
                        contentHtml: contentContainer.innerHTML,
                        plainText: contentContainer.textContent.trim()
                    });
                });
            }
        });

        return processed;
    }

    // Render feed items based on filter and search
    function renderFeed() {
        if (allReleases.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <h3>No releases found</h3>
                    <p>Try refreshing or check back later.</p>
                </div>
            `;
            return;
        }

        // Filter and Search
        const filtered = allReleases.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.type === currentFilter;
            const matchesSearch = searchQuery === '' || 
                                  item.date.toLowerCase().includes(searchQuery) ||
                                  item.plainText.toLowerCase().includes(searchQuery) ||
                                  (item.typeName && item.typeName.toLowerCase().includes(searchQuery));
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>No matching results</h3>
                    <p>Try adjusting your search query or filters.</p>
                </div>
            `;
            return;
        }

        // Group by Date for display
        const groupedByDate = {};
        filtered.forEach(item => {
            if (!groupedByDate[item.date]) {
                groupedByDate[item.date] = {
                    link: item.link,
                    updates: []
                };
            }
            groupedByDate[item.date].updates.push(item);
        });

        let html = '';
        for (const [date, data] of Object.entries(groupedByDate)) {
            html += `
                <div class="release-date-group">
                    <div class="date-indicator"></div>
                    <div class="release-date-header">
                        <span>${date}</span>
                        <a href="${data.link}" target="_blank" title="View official release notes"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                    </div>
            `;

            data.updates.forEach(item => {
                const isSelected = selectedUpdateId === item.id ? 'selected' : '';
                const displayType = item.typeName || 'Update';
                html += `
                    <div class="update-card ${isSelected}" id="card-${item.id}" data-id="${item.id}">
                        <div class="update-header">
                            <span class="update-badge ${item.badgeClass}">
                                <i class="${item.type === 'feature' ? 'fa-solid fa-star' : item.type === 'changed' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-ban'}"></i>
                                ${displayType}
                            </span>
                            
                            <div class="card-actions">
                                <button class="btn btn-share" onclick="event.stopPropagation(); window.appActions.selectUpdate('${item.id}')">
                                    <i class="fa-brands fa-x-twitter"></i> Tweet This
                                </button>
                            </div>
                        </div>
                        <div class="update-content">
                            ${item.contentHtml}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        feedContainer.innerHTML = html;
        
        // Add click listener on cards to select/toggle selection
        document.querySelectorAll('.update-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                selectUpdate(id);
            });
        });
    }

    // Select an update to share/tweet
    function selectUpdate(id) {
        // Toggle selected state
        if (selectedUpdateId === id) {
            selectedUpdateId = null;
            closeTweetDrawer();
        } else {
            selectedUpdateId = id;
            const updateItem = allReleases.find(item => item.id === id);
            if (updateItem) {
                // Highlight active card
                document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
                document.getElementById(`card-${id}`).classList.add('selected');
                
                // Populate tweet draft
                // Format text: BigQuery release summary + link
                const typeText = updateItem.typeName ? `[${updateItem.typeName}] ` : '';
                let truncatedText = updateItem.plainText.substring(0, 160);
                if (updateItem.plainText.length > 160) {
                    truncatedText += '...';
                }
                
                const tweetText = `BigQuery Update (${updateItem.date}):\n${typeText}${truncatedText}\n\nRead more: ${updateItem.link}`;
                
                tweetTextarea.value = tweetText;
                updateCharCount();
                openTweetDrawer();
            }
        }
        renderFeed();
    }

    // Open/Close drawer
    function openTweetDrawer() {
        tweetDrawer.classList.add('open');
    }

    function closeTweetDrawer() {
        tweetDrawer.classList.remove('open');
        selectedUpdateId = null;
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    }

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCountSpan.textContent = len;
        if (len > 280) {
            charCountSpan.style.color = 'var(--color-deprecated)';
        } else {
            charCountSpan.style.color = 'var(--text-muted)';
        }
    }

    // Submit tweet via web intent
    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, '_blank');
    });

    // Expose selectUpdate action globally for click handlers in HTML templates
    window.appActions = {
        selectUpdate: selectUpdate
    };
});
