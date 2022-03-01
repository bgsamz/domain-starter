import React, {useEffect, useState} from 'react';
import {ethers} from 'ethers';
import twitterLogo from './assets/twitter-logo.svg';
import contractAbi from './utils/contractAbi.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import {networks} from "./utils/networks";
import './styles/App.css';

// Constants
const TWITTER_HANDLE = 'bgsamz';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TLD = '.mus';
const CONTRACT_ADDRESS = '0x24e19B546Bc86468cEABA3A9DAf5B1AcD0bf8ba5';
const SPOTIFY_URL_PREFIX = 'https://open.spotify.com/track/';

const App = () => {
	const [network, setNetwork] = useState('');
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{chainId: '0x13881'}],
				});
			} catch (error) {
				// Prompt the user to add the right chain if they don't
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [{
								chainId: '0x13881',
								chainName: 'Polygon Mumbai Testnet',
								rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
								nativeCurrency: {
									name: 'Mumbai Matic',
									symbol: 'MATIC',
									decimals: 18
								},
								blockExplorerUrls: ['https://mumbai.polygonscan.com/']
							}]
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		}
	}

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

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
		ethereum.on('chainChanged', handleChainChanged);
	}

	const parseSpotifyUrl = () => {
		let recordToUpdate = null;
		if (!record.startsWith(SPOTIFY_URL_PREFIX)) {
			alert('Record must be a valid spotify url!')
			setRecord('');
		} else {
			recordToUpdate = record.substring(SPOTIFY_URL_PREFIX.length).split('?')[0];
			setRecord(recordToUpdate);
		}
		return recordToUpdate;
	}

	const mintDomain = async () => {
		setLoading(true);

		let recordToUpdate = parseSpotifyUrl();
		if (!domain || !recordToUpdate) {
			setLoading(false);
			return;
		} else if (domain.length < 3) {
			alert('Domain must be at least 3 characters long!');
			setLoading(false);
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

					tx = await contract.setRecord(domain, recordToUpdate);
					await tx.wait();

					console.log(`Record set! https://mumbai.polygonscan.com/tx/${tx.hash}`);

					// Get our mints after a short wait to see the new one in realtime
					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				} else {
					alert("Transaction failed! Try again.");
				}
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	}

	const updateDomain = async () => {
		setLoading(true);

		// Parse the spotify URL first, this will clear the record if it's invalid
		let recordToUpdate = parseSpotifyUrl();
		if (!recordToUpdate || !domain) {
			setLoading(false);
			return;
		}

		console.log(`Updating domain ${domain} with record ${recordToUpdate}`);
		try {
			const {ethereum} = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let tx = await contract.setRecord(domain, recordToUpdate);
				await tx.wait();
				console.log(`Record set https://mumbai.polygonscan.com/tx/${tx.hash}`);

				await fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	}

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}

	const fetchMints = async () => {
		try {
			const {ethereum} = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				const names = await contract.getAllNames();

				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("Mints fetched: ", mintRecords);
				setMints(mintRecords);
			}
		} catch (error) {
			console.log(error);
		}
	}

	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);

	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media3.giphy.com/media/ggcNOq2PyRFv8CDcLn/giphy.gif" alt="Dahyun gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);

	const renderInputForm = () => {
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<h2>Please connect to the Polygon Mumbai Testnet!</h2>
					<button className="cta-button mint-button" onClick={switchNetwork}>Click here to switch networks</button>
				</div>
			);
		}

		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
						disabled={loading}
					/>
					<p className='tld'> {TLD} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='Spotify favorite song link!'
					onChange={e => setRecord(e.target.value)}
					disabled={loading}
				/>

				{editing ? (
					<div className="button-container">
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set Record
						</button>
						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
							Cancel
						</button>
					</div>
				) : (
					<div className="button-container">
						<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
							Mint
						</button>
					</div>
				)}
			</div>
		);
	};

	const renderSpotifyIframe = (trackId) => {
		return (
			<iframe
				style={{"borderRadius": "12px"}}
				src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
				width="100%" height="380" frameBorder="0" allowFullScreen=""
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
			</iframe>
		);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle">Recently minted domains!</p>
					<div className="mint-list">
						{mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className="mint-row">
										<a className="link"
										   href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
										   target="_blank" rel="noopener noreferrer">
											<p className="underlined">{" "}{mint.name}{" "}</p>
										</a>
										{mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit Button"/>
											</button>
											: null
										}
									</div>
									<p>{renderSpotifyIframe(mint.record)}</p>
								</div>
							)
						})}
					</div>
				</div>
			);
		}
	};

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

  	return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
					  		<p className="title">🎤 Music Name Service 🎤</p>
						  	<p className="subtitle">Your favorite song on the blockchain!</p>
						</div>
						<div className="right">
							<img alt="Network Logo" className="logo" src={network.includes("Polygon") ? polygonLogo : ethLogo} />
							{currentAccount ? <p>Wallet: {currentAccount.slice(0,6)}...{currentAccount.slice(-4)}</p> : <p>Not connected</p>}
						</div>
					</header>
				</div>

				{currentAccount ? renderInputForm() : renderNotConnectedContainer()}
				{mints && renderMints()}

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
