// quizTest.js
import { Builder, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';
// import { Options as FirefoxOptions } from 'selenium-webdriver/firefox.js';
// import { Options as SafariOptions } from 'selenium-webdriver/safari.js';


import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import assert from 'assert';
import fs from 'fs';

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

class QuizHost {
    constructor(baseUrl, sessionCode) {
        this.baseUrl = baseUrl;
        this.sessionCode = sessionCode;
        this.stompClient = null;
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.connectedUsers = 0;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // const socket = new SockJS(`http://localhost:8080/quiz-websocket`);
                const socket = new SockJS(`https://tech.telusko.com/quiz-websocket`);

                this.stompClient = new Client({
                    webSocketFactory: () => socket,
                    onConnect: () => {
                        console.log("Host WebSocket connected");
                        
                        // Subscribe to user connection updates
                        this.stompClient.subscribe(`/topic/userConnections/${this.sessionCode}`, (message) => {
                            try {
                                const connectionData = JSON.parse(message.body);
                                if (connectionData.action === 'JOIN') {
                                    this.connectedUsers++;
                                    console.log(`User connected. Total connected users: ${this.connectedUsers}`);
                                }
                            } catch (parseError) {
                                console.error('Error parsing connection message:', parseError);
                            }
                        });

                        // Subscribe to questions channel
                        this.stompClient.subscribe(`/topic/quizQuestions/${this.sessionCode}`, (message) => {
                            try {
                                const receivedData = JSON.parse(message.body);
                                if (!receivedData.isQuizEnd && Array.isArray(receivedData)) {
                                    this.questions = receivedData;
                                    console.log(`Received ${this.questions.length} questions from channel`);
                                }
                            } catch (parseError) {
                                console.error('Error parsing message:', parseError);
                            }
                        });
                        
                        resolve();
                    },
                    onStompError: (error) => {
                        console.error('Host STOMP error:', error);
                        reject(error);
                    },
                    debug: (str) => {
                        console.log('STOMP DEBUG:', str);
                    }
                });

                this.stompClient.activate();
            } catch (error) {
                console.error('Error in WebSocket connection:', error);
                reject(error);
            }
        });
    }

    async waitForUsers(expectedUsers, timeout = 2400000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkUsers = () => {
                if (this.connectedUsers >= expectedUsers) {
                    console.log(`All ${expectedUsers} users have connected`);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Failed to connect ${expectedUsers} users within timeout. Connected: ${this.connectedUsers}`));
                } else {
                    setTimeout(checkUsers, 1000);
                }
            };
            checkUsers();
        });
    }

    async waitForQuestions(timeout = 2400000) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            const checkQuestions = () => {
                if (this.questions.length > 0) {
                    resolve(this.questions);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('No questions received from channel within timeout'));
                } else {
                    setTimeout(checkQuestions, 1000);
                }
            };
            checkQuestions();
        });
    }

    async broadcastNextQuestion() {
        if (!this.stompClient?.connected) {
            throw new Error("Host WebSocket not connected");
        }

        if (this.currentQuestionIndex < this.questions.length) {
            console.log(`Broadcasting question ${this.currentQuestionIndex + 1}`);
            this.stompClient.publish({
                destination: `/app/nextQuestion/${this.sessionCode}`,
                body: JSON.stringify({ index: this.currentQuestionIndex })
            });
            this.currentQuestionIndex++;
            return true;
        }
        return false;
    }

    disconnect() {
        if (this.stompClient?.connected) {
            this.stompClient.deactivate();
        }
    }
}

class QuizTester {
    constructor(userId, baseUrl, sessionCode) {
        this.userId = userId;
        this.driver = null;
        this.baseUrl = baseUrl;
        this.sessionCode = sessionCode;
    }

   

    async setup() {
        const options = new Options()
            .addArguments('--no-sandbox')
            .addArguments('--disable-dev-shm-usage')
            .addArguments('--disable-gpu')
            // .addArguments('--headless'); // Uncomment for headless mode

        try {
            this.driver = await new Builder()
                .forBrowser('chrome')
                .setChromeOptions(options)
                .build();
        } catch (error) {
            console.error(`User ${this.userId}: Error setting up driver`, error);
            throw error;
        }
    }
    
    

    async waitForElement(selector, timeout = 2400000) {
        try {
            return await this.driver.wait(
                until.elementLocated(By.css(selector)),
                timeout
            );
        } catch (error) {
            console.error(`User ${this.userId}: Error waiting for element ${selector}`, error);
            throw error;
        }
    }

    async joinQuizSession() {
        try {
          await this.driver.get(`${this.baseUrl}/join`);
    
          // Wait for and fill the name input
          const nameInput = await this.waitForElement('input#name');
          await nameInput.sendKeys(`TestUser${this.userId}`);
    
          // Wait for and fill the session code input
          const sessionInput = await this.waitForElement('input#sessionCode');
          await sessionInput.sendKeys(this.sessionCode);
    
          // Find and click the join button
          const joinButton = await this.waitForElement('button[type="submit"]');
          await joinButton.click();
    
          // Wait for quiz page to load using new test ID
          await this.waitForElement('[data-testid="quiz-card"]', 30000);
    
          console.log(`User ${this.userId}: Successfully joined quiz`);
          return true;
        } catch (error) {
          console.error(`User ${this.userId}: Error joining quiz:`, error);
          return false;
        }
      }
    

    async answerCurrentQuestion() {
        try {
          // Wait for the question container to be present
          await this.waitForElement('[data-testid="question-container"]', 30000);
    
          // Wait for options container
          await this.waitForElement('[data-testid="options-container"]', 30000);
    
          // Select a random option using the new test IDs
          const answered = await this.selectOptionByTestId();
          
          if (!answered) {
            console.error(`User ${this.userId}: Failed to select an option`);
            return false;
          }
    
          // Submit using the test ID
          const submitted = await this.submitByTestId();
    
          if (!submitted) {
            console.error(`User ${this.userId}: Failed to submit answer`);
            return false;
          }
    
          console.log(`User ${this.userId}: Successfully answered question`);
          await this.driver.sleep(1000);
          return true;
        } catch (error) {
          console.error(`User ${this.userId}: Error in answering:`, error);
          return false;
        }
      }
    
      async selectOptionByTestId() {
        try {
          // Find all option elements using test ID
          const options = await this.driver.findElements(By.css('[data-testid^="option-"]'));
          
          if (options.length === 0) {
            console.log(`User ${this.userId}: No options found`);
            return false;
          }
    
          // Select a random option
          const randomIndex = Math.floor(Math.random() * options.length);
          await options[randomIndex].click();
          
          return true;
        } catch (error) {
          console.error(`User ${this.userId}: Test ID option selection failed:`, error);
          return false;
        }
      }
    
      async submitByTestId() {
        try {
          const submitButton = await this.waitForElement('[data-testid="submit-button"]');
          
          if (!submitButton) {
            console.log(`User ${this.userId}: Submit button not found`);
            return false;
          }
    
          // Check if button is enabled
          const isDisabled = await submitButton.getAttribute('disabled');
          if (isDisabled) {
            console.log(`User ${this.userId}: Submit button is disabled`);
            return false;
          }
    
          await submitButton.click();
          return true;
        } catch (error) {
          console.error(`User ${this.userId}: Test ID submission failed:`, error);
          return false;
        }
      }
    
      async runTest() {
        try {
            await this.setup();
            console.log(`User ${this.userId}: Starting test`);
    
            // Join quiz session
            const joinResult = await this.joinQuizSession();
            if (!joinResult) return false;
    
            // Wait a moment after joining
            await this.driver.sleep(2000);
    
            // Get total questions from the page or from host
            let questionCount = 0;
            let isQuizActive = true;
            
            while (isQuizActive) {
                try {
                    // Check if quiz is still active
                    const quizContainer = await this.driver.findElements(By.css('[data-testid="quiz-card"]'));
                    if (quizContainer.length === 0) {
                        isQuizActive = false;
                        continue;
                    }
    
                    // Try to answer the current question
                    const answered = await this.answerCurrentQuestion();
                    
                    if (answered) {
                        questionCount++;
                        // Random wait between 3-7 seconds between questions
                        await this.driver.sleep(Math.floor(Math.random() * 4000) + 3000);
                    } else {
                        // If unable to answer, wait a bit and continue
                        await this.driver.sleep(2000);
                    }
                } catch (questionError) {
                    console.error(`User ${this.userId}: Error in question loop:`, questionError);
                    // Wait before next attempt
                    await this.driver.sleep(2000);
                }
            }
    
            console.log(`User ${this.userId}: Completed ${questionCount} questions`);
            return true;
        } catch (error) {
            console.error(`User ${this.userId} test failed:`, error);
            return false;
        }
        // Remove the finally block with cleanup to keep browsers open
    }

    async cleanup() {
        if (this.driver) {
            try {
                await this.driver.quit();
            } catch (error) {
                console.error(`User ${this.userId}: Error during cleanup`, error);
            }
        }
    }
}

class TestManager {
    constructor(numberOfUsers, baseUrl, sessionCode) {
        this.numberOfUsers = numberOfUsers;
        this.baseUrl = baseUrl;
        this.sessionCode = sessionCode;
        this.testers = [];
        this.host = new QuizHost(baseUrl, sessionCode);
    }

    async runConcurrentTests(autoCleanup = false) {
        console.log(`Starting test with ${this.numberOfUsers} concurrent users`);
        const startTime = Date.now();

        try {
            // Connect host first
            await this.host.connect();
            console.log('Host connected successfully');

            // Create and start all user tests
            this.testers = Array.from({ length: this.numberOfUsers }, 
                (_, i) => new QuizTester(i + 1, this.baseUrl, this.sessionCode));

            // Wait for all users to join
            const joinPromises = this.testers.map(tester => tester.runTest());
            const joinResults = await Promise.all(joinPromises);

            // Count successful joins
            const successfulJoins = joinResults.filter(Boolean).length;
            console.log(`${successfulJoins} users joined successfully`);

            // Wait for all users to be connected on the host side
            await this.host.waitForUsers(successfulJoins);

            // Wait for questions to be available
            const questions = await this.host.waitForQuestions();
            console.log(`Retrieved ${questions.length} questions from channel`);

            // Progress through each question
            if (successfulJoins > 0) {
                for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
                    // Broadcast next question
                    await this.host.broadcastNextQuestion();
                    console.log(`Broadcasted question ${questionIndex + 1}`);

                    // Have all users answer the current question
                    await Promise.all(
                        this.testers.map(tester => tester.answerCurrentQuestion())
                    );

                    // Wait for question time limit before moving to next question
                    const timeLimit = questions[questionIndex].timeLimit || 15;
                    await new Promise(resolve => setTimeout(resolve, (timeLimit + 2) * 1000));
                }
            }

            console.log(`All tests completed successfully in ${(Date.now() - startTime)/1000}s`);
            return true;

        } catch (error) {
            console.error('Test execution failed:', error);
            return false;
        } finally {
            // Cleanup
            if (autoCleanup) {
                this.host.disconnect();
                await Promise.all(this.testers.map(tester => tester.cleanup()));
            }
        }
    }
}

// Run tests
async function runTests() {
    try {
        const numberOfUsers = parseInt(process.env.USERS || '20', 10);
        // const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const baseUrl = process.env.BASE_URL || 'https://telusq.telusko.com';

        const sessionCode = process.env.SESSION_CODE || '923866';
        
        console.log('Test Configuration:');
        console.log(`- Number of Users: ${numberOfUsers}`);
        console.log(`- Base URL: ${baseUrl}`);
        console.log(`- Session Code: ${sessionCode}`);

        const manager = new TestManager(numberOfUsers, baseUrl, sessionCode);
        const success = await manager.runConcurrentTests(false);  // Pass false to prevent auto-cleanup
        
        // Don't exit the process to keep browsers open
        if (!success) {
            console.log('Tests failed but keeping browsers open for inspection');
        }
    } catch (error) {
        console.error('Fatal error in test execution:', error);
        // Only exit on fatal errors
        process.exit(1);
    }
}

runTests();