# FeedbackWallet

feedbackwallet.com, the platform where users can review apps and websites, connect with expert reviewers, and earn rewards

## User Testing Guide: Timer and Notifications

### Getting Started

1. Open the focusbutton.com
2. Click "Download from Chrome Web Store" in the footer
3. Click "Add to Chrome" to install
4. Wait for installation to complete
5. Look for the focusbutton icon in your browser toolbar

## Web Version Testing Steps

### 1. Test Timer Setup

1. Open focusbutton.com
2. When first using the timer:
   - Look for the notification permission popup
   - Click "Allow" to enable notifications
3. Find the timer section
4. Try setting a 5-second timer:
   - Increase the duration to "5s"
   - Press start and watch the countdown
   - Verify the timer completes
5. Test custom duration:
   - Enter your own duration (e.g., 15 seconds)
   - Start the timer
   - Check if it counts down correctly
6. Test timer controls:
   - Start a 30-second timer
   - Click pause - timer should stop
   - Click start again - timer should resume
   - Try the cancel button - timer should reset

### 2. Test Background Behavior

1. Open multiple browser tabs:
   - Start a timer on focusbutton
   - Switch to another tab after a few seconds
   - Return to focusbutton
   - Verify timer continued counting

## Chrome Extension Testing Steps

### Pro Tips

1. For the extension:
   - Pin it to your toolbar for easy access
   - You can use keyboard up and down arrows while setting timer

### 1. Test Extension Timer

1. Click the focusbutton icon in toolbar
2. In the extension page:

   - Locate the timer controls
   - Set a 5-second timer
   - Watch the countdown in the page

3. Test quick timers:

   - Set a 2-minute timer
   - Verify accurate countdown

4. Test timer controls:
   - Start a longer timer
   - Try the pause button
   - Resume the timer
   - Use the cancel button

### 2. Test Extension Notifications

1. Start a short timer:

   - Set 5 seconds
   - Minimize the browser
   - Wait for completion
   - Check for notification

2. Test notification interaction:
   - Click the notification
   - Verify it opens the extension

### 3. Test Extension Background

1. Start a timer in the extension
2. Close the extension page
3. Continue browsing other sites
4. Check that timer completes correctly


## Pomodoro and Tasks Testing Steps

### 4. Test Pomodoro Timer

1. Start a pomodoro session:
   - Click the timer to start 25-minute focus session
   - Verify countdown starts
2. Test timer controls:
   - Pause the timer - should stop
   - Resume - should continue from paused time
   - Verify state persists on page refresh
3. Test completion:
   - Let timer reach zero after resetting for 5 seconds
   - Verify notification sound plays
   - Check completion animation

### 5. Test Task Management

1. Create new tasks:
   - Click "New task" button
   - Enter task title
   - Verify task appears in list
2. Test task operations:
   - Edit task (click pencil icon)
   - Delete task (click trash icon)
   - Confirm delete with "Are you sure?"
3. Test task ordering:
   - Add tasks
   - Drag tasks to reorder
   - Verify new order persists
4. Test task selection:
   - Click task to select
   - Verify timer sets for selected task
   - Verify timer starts when click again
   - Check task highlighting

### 6. Test Reports Feature

1. Access reports:
   - Click "Reports" button
   - Verify chart appears
2. Check chart data:
   - Verify task completion times shown
   - Check multiple days of data
   - Confirm task colors match
3. Test data persistence:
   - Add new task completions
   - Refresh page
   - Verify data remains
   - Check historical trends

### What Makes a Successful Test

Your tests are successful when:

1. Timers:

   - Count down smoothly
   - Keep running when minimized
   - Remember their state after pausing

2. Notifications:
   - Appear on time
   - Show clear messages
   - Are easy to interact with?

### Share Your Experience

After completing all tests, please provide feedback on:

1. Timer Functionality

   - Was the timer easy to set up?
   - Did it work reliably in the background?
   - Any issues with start/pause/cancel?

2. Platform Experience

   - Which version did you prefer (web or extension)?
   - Any features you wish were added?

3. Technical Performance
   - Did you notice any delays or lag?
   - Were there any crashes or unexpected behavior?
   - Did background operation work as expected?

Your feedback helps us improve focusbutton for everyone!
