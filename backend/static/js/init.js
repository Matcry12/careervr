// ===== INIT =====
window.addEventListener('load', async () => {
    initMobileNav();
    await checkAuth();

    // Page specific inits
    if ($('questionsContainer')) initTest();
    if ($('chatContext')) updateChatContext();
    if ($('majorContainer')) showResults();
    if ($('dashboardContent')) showDashboard();
    if ($('vrGrid')) {
        initVRImportUI();
        fetchVRJobs();
    }


    // Community Page Init
    if ($('postsContainer')) {
        const defName = getDefaultName();
        if (defName && $('postAuthor')) $('postAuthor').value = defName;
        loadPosts();
    }
});

$('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
