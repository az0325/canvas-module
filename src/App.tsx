import { useState } from 'react';
import Field from './components/Field';
import Header from './components/Header';

import { TImageData } from './common/types/Shape';

function App() {
	const [imageData, setImageData] = useState<TImageData | null>(null); // 도형 글씨 표시

	const handleImageData = (imageData: TImageData) => {
		console.log(imageData);
		setImageData(imageData);
	};

	return (
		<>
			<Header handleImageData={handleImageData} />
			<Field imageData={imageData} />
		</>
	);
}

export default App;
