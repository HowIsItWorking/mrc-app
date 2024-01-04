import './App.css';

import firebase from 'firebase/compat/app';
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { query, collection, onSnapshot, addDoc, getDocs } from 'firebase/firestore';

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
      {user ? <SignOut /> : <SignIn />} 
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
      console.log(chat.id)
      if(chat.data().owner_uid === uid){
        
        firestore.collection("chatRooms").doc(chat.id).delete();
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
              <div className='chatSelectorContainer'>
                <div onClick={() => {
                  chatpass = chat.id;
                  setChatPass(true);
                  //console.log(chat.id);
                  //console.log(query(collection(firestore.collection("chatRooms").doc(chatpass), "messages")));
                }} className='chatSelector'>
                  <h3 className='ChatName'>{chat.data().name}</h3>
                </div>
                  <button
                  className={`deleteBtn ${auth.currentUser.uid === chat.data().owner_uid ? "btnVisible" : "btnInv"}`}
                  onClick={() => deleteRoom(chat)}
                  >Delete</button>
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

  const createChat = async(e) => {
    e.preventDefault();

    const {uid} = auth.currentUser;

    const newChat = {
      capacity: 5,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isPrivate: false,
      name: formValue,
      password: "",
      owner_uid: uid
    }

    await addDoc(collection(firestore, "chatRooms"), newChat);

    setFormValue("");
    updateList();
  }
    return(
      <form onSubmit={createChat}>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)}/>
        <button type='submit'>CreateChat</button>
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
  const [messages, setMessages] = useState([]);
  const [chatData, setChatData] = useState([]);

  const chatRef = firestore.collection("chatRooms").doc(chatpass);

  //! console.log(query(collection(firestore.collection("chatRooms").doc(chatpass), "messages")));

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
    const unsub = onSnapshot(query(chatRef.collection("messages")), (e) =>{

      const msg = [];

      e.forEach((doc) => {
        msg.push(doc.data());
      })
      msg.sort((a,b) => b.createdAt - a.createdAt)

      setChatData(msg);
    });

    setMessages(chatData);

    return ()=>unsub();

  }, [chatData.length]);
  

  return(
    <>
      <div className='chatWindow'>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
      </div>
      <div>
      <form onSubmit={sendMessage}>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)}/>
          <button type='submit'>Send</button>
      </form>
      </div>
    </>
  )
}

function ChatMessage(props){
  const {text, uid, photoURL} = props.message;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";
  return (
    <div className={`message ${messageClass}`}>
    <img src={photoURL} alt={`user pfp`}/>
    <p>{text}</p>
    </div>
  )
}

export default App;
