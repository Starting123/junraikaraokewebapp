// Clear browser data to stop redirect loops
console.log('🧹 Clearing browser data to stop redirect loops');

// Clear localStorage
if (window.localStorage) {
    localStorage.clear();
    console.log('✅ localStorage cleared');
}

// Clear sessionStorage  
if (window.sessionStorage) {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
}

// Stop any running timers
for (let i = 1; i < 99999; i++) window.clearTimeout(i);
for (let i = 1; i < 99999; i++) window.clearInterval(i);

console.log('✅ Timers cleared');

// Remove any redirect flags
delete window.adminPageInitialized;
delete window.checkingAuth; 
delete window.statsLoaded;
delete window.redirectCount;

console.log('✅ Window flags cleared');