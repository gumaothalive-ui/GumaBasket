'use client';
import React, { useState } from 'react';
import styles from './page.module.css';

type Mode = 'login' | 'signup';
type SignupStep = 1 | 2 | 3 | 4;

export default function DriverAuth() {
  const [mode, setMode]       = useState<Mode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Signup form state
  const [signupData, setSignupData] = useState({
    firstName: '', lastName: '',
    email: '', phone: '',
    password: '', confirmPassword: '',
  });

  // Uploaded doc tracking (simulated)
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const markUploaded = (key: string) => setUploaded(u => ({ ...u, [key]: true }));

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { driverLogin } = await import('./actions');
      const res = await driverLogin(loginData.email);
      if (res.success) {
        window.location.href = '/';
      } else {
        setErrorMsg('Invalid credentials');
      }
    } catch {
      setErrorMsg('Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupNext = () => setSignupStep(s => (s + 1) as SignupStep);
  const handleSignupBack = () => setSignupStep(s => (s - 1) as SignupStep);

  const handleSubmitApplication = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSignupStep(4);
    }, 2000);
  };

  const stepLabels = ['Account', 'Identity', 'Vehicle', 'Done'];

  return (
    <div className={styles.container}>

      {/* Left branding panel */}
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          DailyMarket <span style={{ color: '#05A357' }}>●</span>
        </div>
        <div className={styles.heroText}>
          <h1>{mode === 'login' ? 'Welcome back, driver.' : 'Drive when you want, earn what you need.'}</h1>
          <p>
            {mode === 'login'
              ? 'Sign in to your DailyMarket driver account and start earning.'
              : 'Join the DailyMarket local delivery fleet across South Africa.'}
          </p>
        </div>
        <div className={styles.leftStats}>
          <div className={styles.statItem}><span className={styles.statNum}>4,200+</span><span className={styles.statLabel}>Active Drivers</span></div>
          <div className={styles.statItem}><span className={styles.statNum}>R850</span><span className={styles.statLabel}>Avg. Daily Earnings</span></div>
          <div className={styles.statItem}><span className={styles.statNum}>12 cities</span><span className={styles.statLabel}>Coverage Area</span></div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>

          {/* Tab Toggle */}
          <div className={styles.tabRow}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setSignupStep(1); }}
            >Sign In</button>
            <button
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => setMode('signup')}
            >Create Account</button>
          </div>

          {/* ─── LOGIN FORM ─── */}
          {mode === 'login' && (
            <div className={styles.stepCard}>
              <h2>Sign in to your account</h2>
              <p>Enter your credentials to access the dispatch dashboard.</p>
              {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
              <form onSubmit={handleLogin}>
                <div className={styles.inputGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="driver@dailymarket.co.za"
                    value={loginData.email}
                    required
                    onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    required
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  />
                </div>
                <div className={styles.forgotRow}>
                  <a href="#" className={styles.forgotLink}>Forgot password?</a>
                </div>
                <button type="submit" className={styles.primaryBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
              <div className={styles.switchPrompt}>
                Don&apos;t have an account?{' '}
                <span className={styles.switchLink} onClick={() => setMode('signup')}>
                  Register as a driver
                </span>
              </div>
            </div>
          )}

          {/* ─── SIGNUP FLOW ─── */}
          {mode === 'signup' && (
            <div className={styles.stepCard}>

              {/* Progress Bar */}
              <div className={styles.progressBar}>
                {stepLabels.map((label, idx) => (
                  <div key={label} className={styles.progressStep}>
                    <div className={`${styles.progressDot} ${signupStep > idx ? styles.progressDone : signupStep === idx + 1 ? styles.progressActive : ''}`}>
                      {signupStep > idx ? '✓' : idx + 1}
                    </div>
                    <span className={styles.progressLabel}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Account Details */}
              {signupStep === 1 && (
                <>
                  <h2>Create your driver account</h2>
                  <p>Start your application — it only takes a few minutes.</p>
                  <div className={styles.inputRow}>
                    <div className={styles.inputGroup}>
                      <label>First Name</label>
                      <input placeholder="Sipho" value={signupData.firstName} onChange={e => setSignupData({ ...signupData, firstName: e.target.value })} />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Last Name</label>
                      <input placeholder="Ndlovu" value={signupData.lastName} onChange={e => setSignupData({ ...signupData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Email Address</label>
                    <input type="email" placeholder="driver@gmail.com" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>SA Mobile Number</label>
                    <input placeholder="+27 82 123 4567" value={signupData.phone} onChange={e => setSignupData({ ...signupData, phone: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Password</label>
                    <input type="password" placeholder="Min. 8 characters" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Repeat password" value={signupData.confirmPassword} onChange={e => setSignupData({ ...signupData, confirmPassword: e.target.value })} />
                  </div>
                  <button className={styles.primaryBtn} onClick={handleSignupNext}>Continue →</button>
                  <div className={styles.switchPrompt}>
                    Already have an account?{' '}
                    <span className={styles.switchLink} onClick={() => setMode('login')}>Sign in</span>
                  </div>
                </>
              )}

              {/* Step 2: Personal Legal Docs */}
              {signupStep === 2 && (
                <>
                  <h2>Identity & Legal Documents</h2>
                  <p>South African law requires these documents to legally permit you to carry out delivery work for compensation.</p>
                  <div className={styles.reqList}>
                    {[
                      { key: 'id', icon: '🪪', title: 'Valid SA ID or Passport', sub: 'Foreign nationals must include a valid work permit.' },
                      { key: 'licence', icon: '🚗', title: "Valid SA Driver's Licence", sub: 'You must be 21 years or older.' },
                      { key: 'prdp', icon: '📜', title: 'Professional Driving Permit (PrDP)', sub: 'Valid Category G or P permit — required by law to transport goods for payment.' },
                      { key: 'bgcheck', icon: '✅', title: 'Criminal Background Check', sub: 'Screening certificate from PostNet or directly via SAPS.' },
                      { key: 'proof', icon: '🏠', title: 'Proof of Residence', sub: 'Bank statement or utility bill, not older than 3 months.' },
                    ].map(item => (
                      <div key={item.key} className={`${styles.reqItem} ${uploaded[item.key] ? styles.reqItemDone : ''}`}>
                        <div className={styles.reqIcon}>{uploaded[item.key] ? '✓' : item.icon}</div>
                        <div className={styles.reqText}>
                          <strong>{item.title}</strong>
                          <span>{item.sub}</span>
                        </div>
                        <button className={`${styles.uploadBtn} ${uploaded[item.key] ? styles.uploadedBtn : ''}`}
                          onClick={() => markUploaded(item.key)}>
                          {uploaded[item.key] ? 'Uploaded' : 'Upload'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.btnRow}>
                    <button className={styles.backBtn} onClick={handleSignupBack}>Back</button>
                    <button className={styles.primaryBtn} onClick={handleSignupNext}>Next: Vehicle →</button>
                  </div>
                </>
              )}

              {/* Step 3: Vehicle Docs */}
              {signupStep === 3 && (
                <>
                  <h2>Vehicle Certification</h2>
                  <p>Your vehicle must meet South African commercial ride-hailing standards for the safety of all parties.</p>
                  <div className={styles.reqList}>
                    {[
                      { key: 'photos', icon: '🚙', title: '4-Door Vehicle Photos', sub: 'Sedan, Hatchback, or SUV. Front, back & interior shots required.' },
                      { key: 'roadworthy', icon: '📑', title: 'Roadworthy Certificate', sub: 'Valid and current registration + roadworthy certification.' },
                      { key: 'insurance', icon: '🛡️', title: 'Commercial Insurance Proof', sub: 'Must explicitly cover ride-hailing/commercial passenger liability.' },
                      { key: 'dekra', icon: '🔎', title: 'DEKRA / CarScan Inspection', sub: 'Formal vehicle inspection report confirming roadworthy mechanical condition.' },
                    ].map(item => (
                      <div key={item.key} className={`${styles.reqItem} ${uploaded[item.key] ? styles.reqItemDone : ''}`}>
                        <div className={styles.reqIcon}>{uploaded[item.key] ? '✓' : item.icon}</div>
                        <div className={styles.reqText}>
                          <strong>{item.title}</strong>
                          <span>{item.sub}</span>
                        </div>
                        <button className={`${styles.uploadBtn} ${uploaded[item.key] ? styles.uploadedBtn : ''}`}
                          onClick={() => markUploaded(item.key)}>
                          {uploaded[item.key] ? 'Uploaded' : 'Upload'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.btnRow}>
                    <button className={styles.backBtn} onClick={handleSignupBack}>Back</button>
                    <button className={styles.primaryBtn} onClick={handleSubmitApplication} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Application →'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Success */}
              {signupStep === 4 && (
                <div className={styles.successScreen}>
                  <div className={styles.successIcon}>🎉</div>
                  <h2>Application Submitted!</h2>
                  <p>
                    Thank you, <strong>{signupData.firstName || 'Driver'}</strong>. Your application is under review.
                    DailyMarket will verify your documents within <strong>1–3 business days</strong> and send approval to <strong>{signupData.email || 'your email'}</strong>.
                  </p>
                  <div className={styles.nextStepsList}>
                    <div className={styles.nextStep}><span>1</span> Document verification in progress</div>
                    <div className={styles.nextStep}><span>2</span> You will receive an approval email</div>
                    <div className={styles.nextStep}><span>3</span> Activate your account and link your bank</div>
                    <div className={styles.nextStep}><span>4</span> Start accepting delivery jobs</div>
                  </div>
                  <button className={styles.primaryBtn} onClick={() => window.location.href = '/'}>
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
