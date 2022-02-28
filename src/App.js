import React, {useEffect, useState} from 'react';
import {ethers} from "ethers";
import twitterLogo from './assets/twitter-logo.svg';
import contractAbi from './utils/contractAbi.json';
import './styles/App.css';

// Constants
const TWITTER_HANDLE = 'bgsamz';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TLD = '.mus';
const CONTRACT_ADDRESS = '0x348ead3ebFC44bf70c93D89dd0cD1A22530a892C';
const SPOTIFY_URL_PREFIX = 'https://open.spotify.com/track/';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}

			const accounts = await ethereum.request({ method: "eth_requestAccounts" });

			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error)
		}
	}

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log("Make sure you have MetaMask!");
			return;
		} else {
			console.log("We have the ethereum object", ethereum);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}
	}

	const parseSpotifyUrl = () => {
		if (!record.startsWith(SPOTIFY_URL_PREFIX)) {
			alert('Record must be a valid spotify url!')
			setRecord('');
		} else {
			setRecord(record.substring(SPOTIFY_URL_PREFIX.length).split('?')[0]);
		}
	}

	const mintDomain = async () => {
		if (!domain) {
			return;
		} else if (domain.length < 3) {
			alert('Domain must be at least 3 characters long!');
			return;
		}

		parseSpotifyUrl();
		if (!record) {
			// We alert in the parse function, so just return here.
			return;
		}

		// Price is based on the domain length
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log(`Minting domain ${domain} with price ${price}`);
		try {
			const {ethereum} = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				console.log('Popping wallet now to pay gas.');
				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				const receipt = await tx.wait();

				if (receipt.status === 1) {
					console.log(`Domain minted! https://mumbai.polygonscan.com/tx/${tx.hash}`);

					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log(`Record set! https://mumbai.polygonscan.com/tx/${tx.hash}`);

					setRecord('');
					setDomain('');
				} else {
					alert("Transaction failed! Try again.");
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media3.giphy.com/media/ggcNOq2PyRFv8CDcLn/giphy.gif" alt="Dahyun gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);

	const renderInputForm = () => (
		<div className="form-container">
			<div className="first-row">
				<input
					type="text"
					value={domain}
					placeholder='domain'
					onChange={e => setDomain(e.target.value)}
				/>
				<p className='tld'> {TLD} </p>
			</div>

			<input
				type="text"
				value={record}
				placeholder='Spotify favorite song link!'
				onChange={e => setRecord(e.target.value)}
			/>

			<div className="button-container">
				<button className='cta-button mint-button' disabled={null} onClick={mintDomain}>
					Mint
				</button>
				<button className='cta-button mint-button' disabled={null} onClick={null}>
					Set data
				</button>
			</div>

		</div>
	);

	useEffect(() => {
		checkIfWalletIsConnected();
	}, [])

  	return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
						  <p className="title">🎤 Music Name Service 🎤</p>
						  <p className="subtitle">Your favorite song on the blockchain!</p>
						</div>
					</header>
				</div>

				{currentAccount ? renderInputForm() : renderNotConnectedContainer()}

				<div>
					<iframe
						style={{"borderRadius": "12px"}}
						src="https://open.spotify.com/embed/track/2qQpFbqqkLOGySgNK8wBXt?utm_source=generator"
						width="50%" height="380" frameBorder="0" allowFullScreen=""
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">

					</iframe>
				</div>

		 		<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`@${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
