import './App.css';

import firebase from 'firebase/compat/app';
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { doc, query, collection, onSnapshot, addDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

import {useAuthState} from "react-firebase-hooks/auth";
import { useEffect, useState } from 'react';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_API_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_API_PROJECT_ID,
  storageBucket: process.env.REACT_APP_API_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_API_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_API_APP_ID,
  measurementId: process.env.REACT_APP_API_APP_MEASUREMENT_ID
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebaseApp.firestore();

let chatpass;

function App() {
  const [user] = useAuthState(auth);
  const [isChatChoosen, setIsChatChoosen] = useState(false);
  const [chatPass, setChatPass] = useState();


  useEffect(()=>{
    setIsChatChoosen(chatpass != null)
  },[chatPass])

  return (
    <div className="App">
      <header>
      {!user && <SignIn />}
      {user && !isChatChoosen && <SignOut />}
      {isChatChoosen && <GoBack setChatPass={setChatPass}/>}
      {isChatChoosen && chatpass != undefined && <h3 className='ChatTitle'>{chatpass.data().name}</h3>}
      </header>
      <aside>
        {user && !isChatChoosen && <ChatSelectPage setChatPass={setChatPass}/>}
      </aside>

      <section>
        {isChatChoosen && <ChatRoom />}
      </section>
    </div>
  );
}
const chatListRef = query(collection(firestore, "chatRooms"));


function GoBack({setChatPass, ...rest}){
  return(
    <>
      <button onClick={() => {
        chatpass = null;
        setChatPass(false);
      }}>Go back</button>
    </>
  )
}

function ChatSelectPage({setChatPass, ...rest}){
  const [chatList, setChatList] = useState([]);
  const chatListData = [];

  async function getList() {
    const hold = await getDocs(chatListRef);
    hold.forEach(doc => {
      if(!chatListData.includes(doc)) chatListData.push(doc);
    })
    setChatList([...chatListData]);
  }

  useEffect(()=>{
    getList().catch((e)=>{console.log("Error getting list of chats", e)});
  },[]);

  function deleteRoom(chat){
    const {uid} = auth.currentUser;
      if(uid === chat.data().owner_uid){

        let pass = prompt("THIS ACTION CAUSES PERMANENT LOSS OF DATA.\nOnly do this if you know what you're doing.\nEter the room name to delete.")


        if(pass === chat.data().name){
          firestore.collection("chatRooms").doc(chat.id).delete();
        }
        
        getList();
      }
  }

  return (
      <>
      <h1>Select a chat and start typing!</h1>
        <div className='ChatList'>
        {chatList && chatList.map(
          chat => {
            return(
              <div key={chat.id} className='chatSelectorContainer'>
                <div
                onClick={() => {
                  if(chat.data().isPrivate){
                    let pass = prompt("Please, enter the password.", "Here goes the password");
                    if(pass === chat.data().password){
                      chatpass = chat;
                      setChatPass(true);
                    } else{
                      alert('Please try again');
                      return;
                    }
                  } else {
                    chatpass = chat;
                    setChatPass(true);
                  }
                }} className='chatSelector'>
                  <h3 className='ChatName'>{chat.data().name} {chat.data().isPrivate && "🔒"}</h3>
                  <UsersOnline chat={chat} total={chat.data().capacity}/>
                </div>
                <p></p>
                {auth.currentUser.uid === chat.data().owner_uid &&
                <button
                  className={`deleteBtn`}
                  onClick={() => deleteRoom(chat)}
                  >Delete</button>}
              </div>
            )
          }
        )}
        </div>
        <section>
          <CreateChatRoom updateList={getList}/>
        </section>
    </>
  )
}

function CreateChatRoom({updateList}){

  const [formValue, setFormValue] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [passwordInputValue, setPasswordInputValue] = useState("");
  const [capacityInputValue, setCapacityInputValue] = useState(5);

  const createChat = async(e) => {

    if(formValue === ""){
      console.log("A chat must contain a name.")
      e.preventDefault();
    return;
    }
    e.preventDefault();

    const {uid} = auth.currentUser;

    const newChat = {
      capacity: capacityInputValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isPrivate: isPrivate,
      name: formValue,
      password: passwordInputValue,
      owner_uid: uid
    }

    await addDoc(collection(firestore, "chatRooms"), newChat);

    setFormValue("");
    updateList();
  }
    return(
      <form className='createChatForm' onSubmit={createChat}>
      <h3>Create a chat</h3>
        <div className='privateInputContainer'>
          <label htmlFor="IsPrivate">Make it private?</label>
          <input type='checkbox'
          name='IsPrivate'
          defaultChecked=""
          onChange={e => {
            setIsPrivate(e.target.checked)
          }}/>
          {isPrivate &&
          <input
            type='text'
            value={passwordInputValue}
            placeholder='Password for this chat.'
            onChange={e => setPasswordInputValue(e.target.value)}
          />
          }
        </div>
        <div className='capacityInputContainer'>
          <p>Capacity:</p>
          <input type='number'
          min={2} max={100}
          value={capacityInputValue}
          onChange={e => {
            if (Number(e.target.value) < 2){
              e.preventDefault()
              setCapacityInputValue(2)
            } else if (Number(e.target.value) > 100){
              e.preventDefault()
              setCapacityInputValue(100)
            }
            setCapacityInputValue(Number(e.target.value))
          }}

          />
        </div>
        <div>
          <input
          required
          type='text'
          value={formValue}
          placeholder='Name for this chat'
          onChange={(e) => setFormValue(e.target.value)
          }/>
          <button type='submit'>Create</button>
        </div>
      </form>
    )
}

function SignIn(){

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  }

  return(
    <button onClick={signInWithGoogle}>Sign In with Google!</button>
  )
}

function SignOut(){
  return auth.currentUser && ( 
    <button onClick={() => {
      auth.signOut();
      window.location.reload();
    }}>Sign Out</button>
    );
  }
  
function ChatRoom(){

  useEffect(() => {

    const chatUsersRef = collection(firestore.collection("chatRooms").doc(chatpass.id), "users");
    const userDocRef = doc(chatUsersRef, auth.currentUser.uid);

    // Add user to "users" collection when entering the chat
    const addUserToChat = async () => {
      await setDoc(userDocRef, {
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        photoURL: auth.currentUser.photoURL
      });
    };

    addUserToChat();

    const beforeUnloadHandler = async () => {
      try{
        await deleteDoc(userDocRef);
        console.log("User removed from 'users' collection");
      } catch (error){
        console.error("error trying to remove user from 'users' collection.", error);
      }
    }

    window.addEventListener("beforeunload", beforeUnloadHandler);

    return () => {
      beforeUnloadHandler();
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    }
  }, [])


  const [messages, setMessages] = useState([]);

  var chatRef;

  if(chatpass != null){
    chatRef = firestore.collection("chatRooms").doc(chatpass.id);
  }
  const [formValue, setFormValue] = useState("");

  const sendMessage = async(e) => {
    e.preventDefault();

    const {uid, photoURL} = auth.currentUser;

    await addDoc(collection(chatRef, "messages"), {
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL
    })

    setFormValue("");
  }

  useEffect(() => {
    const unsub = onSnapshot(query(chatRef.collection("messages")), async (event) =>{

      const msg = [];

      event.forEach((doc) => {
        msg.push(doc.data());
      })
      msg.sort((a,b) => b.createdAt - a.createdAt)
      
      setMessages(msg);
    });

    return ()=>unsub();

  }, [messages.length]);

  const [usersOnline, setUsersOnline] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(query(chatRef.collection("users")), async (event) =>{

      const users = [];

      event.forEach((doc) => {
        users.push(doc.data());
      })
      
      setUsersOnline(users);
    });

    return ()=>unsub();

  }, [usersOnline.length]);


  return(
    <>
      <div className='chatWindow'>
        {messages && messages.map(msg => <ChatMessage message={msg} />)}
      </div>
      <div className='ChatMiscContainer'>
      <form onSubmit={sendMessage}>
        <input required type='text' value={formValue}
        placeholder='Enter message'
        onChange={(e) => setFormValue(e.target.value)}/>
          <button type='submit'>Send</button>
      </form>
      <div className='UsersContainer'>
      {
        usersOnline && usersOnline.map(user => {
          return <User user={user} key={user.id} />;
        })
      }
      </div>
      </div>
    </>
  )
}

function User({user}){
  return(
    <div className='userProfile'>
      <img src={user.photoURL} alt={user.username}></img>
      <p>{user.username}</p>
    </div>
  )
}

function ChatMessage(props){
  const {text, uid, photoURL} = props.message;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";
  return (
    <div key={props.message.id} className={`message ${messageClass}`}>
    <img src={photoURL} alt={`user pfp`}/>
    <p>{text}</p>
    </div>
  )
}

function UsersOnline({total, chat}){

  const [usersOnline, setUsersOnline] = useState(0);
  const chatData = firestore.collection("chatRooms").doc(chat.id);

  useEffect(() => {
    const unsub = onSnapshot(query(chatData.collection("users")), async (event) =>{

      const users = [];

      event.forEach((doc) => {
        users.push(doc.data());
      })
      
      setUsersOnline(users.length);
    });

    return ()=>unsub();

  }, [usersOnline]);

  return(
    <p>{usersOnline} / {total}</p>
  )
}

export default App;
