import axios from 'axios';

async function checkTime() {
    console.log('--- System Time Diagnostic ---');
    const localTime = new Date();
    console.log('Local System Time:', localTime.toString());
    console.log('Local ISO:', localTime.toISOString());

    try {
        console.log('\nFetching current time...');
        let serverTime: Date;

        try {
            const response = await axios.get('http://worldtimeapi.org/api/timezone/Etc/UTC', { timeout: 10000 });
            serverTime = new Date(response.data.utc_datetime);
            console.log('Source: WorldTimeAPI');
        } catch (e) {
            console.log('WorldTimeAPI failed, trying Google Headers...');
            const response = await axios.get('https://www.google.com', { timeout: 10000 });
            const dateStr = response.headers.date;
            if (!dateStr) throw new Error('Could not get date from Google');
            serverTime = new Date(dateStr);
            console.log('Source: Google Headers');
        }

        console.log('World UTC Time: ', serverTime.toISOString());

        const diffMs = localTime.getTime() - serverTime.getTime();
        const diffSeconds = Math.abs(diffMs / 1000);
        const diffMin = (diffSeconds / 60).toFixed(2);

        console.log(`\nTime Difference: ${diffMin} minutes`);

        if (diffSeconds > 300) { // 5 minutes
            console.log('❌ ALERT: Your system clock is out of sync!');
            if (diffMs > 0) {
                console.log(`   Your computer is ${diffMin} minutes AHEAD of the real time.`);
            } else {
                console.log(`   Your computer is ${diffMin} minutes BEHIND the real time.`);
            }
            console.log('\nTo fix this:');
            console.log('1. Right-click the clock in your taskbar.');
            console.log('2. Select "Adjust date/time".');
            console.log('3. Click the "Sync now" button.');
            console.log('4. Ensure "Set time automatically" and "Set time zone automatically" are ON.');
        } else {
            console.log('✅ Your system clock is within a reasonable range (less than 5 mins difference).');
            console.log('   If you are still seeing the error, check if your Firebase service account key is valid.');
        }
    } catch (error: any) {
        console.error('Failed to fetch external time:', error.message);
        console.log('\nPlease manually compare your computer clock with: https://www.google.com/search?q=current+time+utc');
    }
}

checkTime();
