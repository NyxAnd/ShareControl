import { supabase, recordLog } from './supabase-config.js'

export async function login(email,password){

const { data,error } =
await supabase.auth.signInWithPassword({

email,
password

})

if(error){

alert(error.message)

return

}

// Guardar login real en DB
try{
  await recordLog({ event_type: 'login', player_id: data?.user?.email || email, message: `Login exitoso de ${email}` })
}catch(e){ console.warn('Record log failed', e) }

// Intentar notificar login al webhook (no bloquear el redirect)
try{
	const url = localStorage.getItem('discord_webhook') || '';
	if(url){
		const embed = { embeds:[{ title: `Login — ${email}`, description: `${email} inició sesión`, timestamp: new Date().toISOString() }] };
		try{ fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(embed)}); }
		catch(e){ try{ fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:`Login: ${email}`}); }catch(err){} }
	}
}catch(e){console.warn('Login webhook failed',e)}

window.location.href =
'./sharecontrol-dashboard.html'

}

export async function register(
username,
email,
password
){

const { data,error } =
await supabase.auth.signUp({

email,
password,

options:{
data:{
username
}
}

})

if(error){

alert(error.message)

return

}

alert('Account created successfully')

window.location.href =
'./login.html'

}

export async function logout(){
  try{
    const { data:{ user }} = await supabase.auth.getUser()
    const playerId = user?.email || 'unknown'
    await recordLog({ event_type:'logout', player_id: playerId, message: `Logout de ${playerId}` })
  }catch(e){ console.warn('Record logout failed', e) }

await supabase.auth.signOut()

window.location.href =
'./login.html'

}

export async function checkAuth(){

const {
data:{session}
} =
await supabase.auth.getSession()

if(!session){

window.location.href =
'./login.html'

}

return session

}

export async function getCurrentUser(){

const {
data:{user}
} =
await supabase.auth.getUser()

return user

}

export function setupSessionMonitor(redirectPath = './login.html', checkIntervalSec = 30){
	// Escucha cambios de estado de autenticación y redirige si la sesión desaparece
	try{
		supabase.auth.onAuthStateChange((event, session) => {
			if(event === 'SIGNED_OUT' || !session){
				console.log('Auth event:', event, 'session:', session)
				window.location.href = redirectPath
			}
		})
	}catch(e){
		console.warn('Could not attach auth listener:', e)
	}

	// Comprobación periódica por si el token se elimina manualmente
	setInterval(async ()=>{
		try{
			const { data:{session} } = await supabase.auth.getSession()
			if(!session){
				console.log('Session missing on periodic check — redirecting')
				window.location.href = redirectPath
			}
		}catch(e){
			console.error('Session check error:', e)
			// en caso de error crítico, también redirigimos
			window.location.href = redirectPath
		}
	}, checkIntervalSec * 1000)

}