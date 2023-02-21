import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

import CropSquareIcon from '@mui/icons-material/CropSquare';
import EditIcon from '@mui/icons-material/Edit';
import PanToolAltIcon from '@mui/icons-material/PanToolAlt';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import EditOffIcon from '@mui/icons-material/EditOff';
import AccessibilityIcon from '@mui/icons-material/Accessibility';
import UploadIcon from '@mui/icons-material/Upload';

import { TImageData } from '../common/types/Shape';

type TIcons = {
	name: string;
	icon: JSX.Element;
};

const ICONS: TIcons[] = [
	{ name: 'Select', icon: <PanToolAltIcon /> },
	{ name: 'Square', icon: <CropSquareIcon /> },
	{ name: 'Pencil', icon: <EditIcon /> },
	{ name: 'Vector', icon: <TimelineIcon /> },
	{ name: 'MagicWand', icon: <AutoFixNormalIcon /> },
	{ name: 'Eraser', icon: <EditOffIcon /> },
	{ name: 'Skeleton', icon: <AccessibilityIcon /> }
];

type THeader = {
	handleImageData: (imageData: TImageData) => void;
};

function Header(props: THeader) {
	const { handleImageData } = props;

	/**
	 * @description 파일을 이미지로 변환
	 */
	const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files?.length) return;

		const file = e.target.files[0];
		const fileData = await setImageFile(file);
		handleImageData(fileData);
	};

	const setImageFile = (file: File): Promise<TImageData> => {
		return new Promise((resolve, reject) => {
			const fr = new FileReader();
			fr.readAsDataURL(file); // blob
			fr.onload = () => {
				const img: HTMLImageElement = new Image();
				img.src = fr.result as string;
				img.onload = async () => {
					const objectURL = URL.createObjectURL(file);
					resolve({
						imageUrl: objectURL,
						imageFile: file,
						data: img,
						shape: { width: img.width, height: img.height },
						scale: 1
					});
				};
			};
		});
	};

	return (
		<Box sx={{ flexGrow: 1 }}>
			<AppBar position="static" style={{ background: '#59A3B0' }}>
				<Toolbar>
					<Typography variant="h6" noWrap component="div">
						Canvas Module
					</Typography>
					<Box sx={{ flexGrow: 1 }} />
					<Box>
						{ICONS.map((item, index) => (
							<Tooltip key={index} title={item.name} placement="bottom">
								<IconButton size="small" color="inherit">
									{item.icon}
								</IconButton>
							</Tooltip>
						))}
						<Tooltip title="Upload" placement="bottom">
							<IconButton color="inherit" aria-label="upload picture" component="label">
								<input hidden accept="image/*" type="file" onChange={handleFiles} />
								<UploadIcon />
							</IconButton>
						</Tooltip>
					</Box>
				</Toolbar>
			</AppBar>
		</Box>
	);
}

export default Header;
