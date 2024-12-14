import React from "react"
import styles from "./Leaderboard.module.css"
import { exec } from "child_process"

import { AgGridReact } from 'ag-grid-react';

import { ICellRendererParams } from 'ag-grid-community';

function mean(array: Array<number>) {
  return array.reduce((a, b) => a + b, 0) / array.length
}

function formatNumber(number: number) {
  return Number(number.toFixed(1))
}

function get_pass_at_1(
  results_df: Array<any>,
  model: string,
  start: number,
  end: number
) {
  // model and date filter
  /*
  const results = results_df.filter(
    (result) =>
      result["model"] === model &&
      result["date"] >= start &&
      result["date"] <= end
  )
  */
  const results = results_df.filter(
    (result) =>
      result["model"] === model
  )
  const dictionary: { [key: string]: any } = {};

  if (results.length > 0 && results[0] !== null) {
    Object.keys(results[0]).forEach(key => {
      // 直接将字符串赋值给 dictionary[key]
      dictionary[key] = results[0][key];
    });
  } else {
    console.log(`${model}: 不存在`);
  }

  return {
    dictionary
  }
}

function getLeaderboard(
  performances: Array<any>,
  models: Array<any>,
  start: number,
  end: number
) {
  // 辅助函数：提取 `/` 前的部分并转换为 Float
  const extractAndParseFloat = (value: string, index: number): number => {
    const parts = value.split('/');
    return parseFloat(parts[index]);
  };

  return models
    .map((model) => {
      const { dictionary } = get_pass_at_1(
        performances,
        model.model_name,
        0,
        0
      )
      let output: { [key: string]: any } = {}
      output["Model"] = model.model_name
      output["Contaminated"] = false 
      Object.keys(dictionary).forEach(key => {
        if (key != "model" && key != "date"){
          output[key] = dictionary[key];
        }
      });
      return output
    })
    .sort((a, b) => {
      const aWinRate = extractAndParseFloat(a["Avg"], 0);
      const bWinRate = extractAndParseFloat(b["Avg"], 0);
      const aDrawRate = extractAndParseFloat(a["Avg"], 1);
      const bDrawRate = extractAndParseFloat(b["Avg"], 1);

      if (aWinRate !== bWinRate) {
        return bWinRate - aWinRate; // 先按胜率排序
      } else {
        return bDrawRate - aDrawRate; // 胜率相同则按不输不赢的概率排序
      }
    })
    .reduce(
      (
        acc: {
          results: Array<typeof model & { Rank: number | null }>
          rank: number
        },
        model
      ) => {
        let rank = null
        rank = acc.rank
        const currentWinRate = extractAndParseFloat(model["Avg"], 0);
        const currentDrawRate = extractAndParseFloat(model["Avg"], 1);

        if (acc.results.length > 0) {
          const lastWinRate = extractAndParseFloat(acc.results[acc.results.length - 1]["Avg"], 0);
          const lastDrawRate = extractAndParseFloat(acc.results[acc.results.length - 1]["Avg"], 1);

          if (currentWinRate !== lastWinRate || currentDrawRate !== lastDrawRate) {
            acc.rank += 1
            rank = acc.rank
          }
        }

        acc.results.push({
          Rank: rank,
          ...model,
        })
        return acc
      },
      { results: [], rank: 1 }
    ).results
}

function getDateMarksFromModels(models: Array<any>) {
  const modelDates = models
    .filter((model) => model.release_date)
    .map((model) => model.release_date)

  const uniqueDates = [
    // @ts-ignore
    ...new Set(modelDates),
    new Date("2024-01-01").getTime(),
  ]

  return uniqueDates
    .map((date) => ({
      value: date,
      label: new Date(date).toLocaleDateString(undefined, {
        timeZone: "UTC",
      }),
    }))
    .sort((a, b) => a.value - b.value)
}

function getDateMarksFromTimestamps(timestamps: Array<number>) {
  return timestamps.map((timestamp) => ({
    value: timestamp,
    label: new Date(timestamp).toLocaleDateString(undefined, {
      timeZone: "UTC",
    }),
  }))
}

function getMaxValues(performances: Array<any>) {
  // 辅助函数：提取 `/` 前的部分并转换为 Float
  const extractAndParseFloat = (value: string, index: number): number => {
    const parts = value.split('/');
    return parseFloat(parts[index]);
  };

  // 需要比较的键
  const keysToCompare = [
    "User Interface&Experience",
    "Development&Programming",
    "Specialized Computing",
    "Tools, Environments, and Practices",
    "Emerging Technologies&Applications",
    "Miscellaneous and General Inquiry",
    "Databases&Data Handling"
  ];

  // 初始化最大值字典
  const maxValues: { [key: string]: string } = {};

  // 遍历 performances 数组
  performances.forEach(performance => {
    keysToCompare.forEach(key => {
      const value = performance[key];
      const winRate = extractAndParseFloat(value, 0);
      const drawRate = extractAndParseFloat(value, 1);

      // 如果当前键还没有最大值，或者当前值的胜率更大，或者胜率相同但不输不赢的概率更大，则更新最大值
      if (!maxValues[key] || 
          winRate > extractAndParseFloat(maxValues[key], 0) || 
          (winRate === extractAndParseFloat(maxValues[key], 0) && drawRate > extractAndParseFloat(maxValues[key], 1))) {
        maxValues[key] = value;
      }
    });
  });

  return maxValues;
}

function getColumnDefs(columnNames: Array<string>, performances: Array<any>, modelsDict: any, page_idx: string) {
  // 获取最大值
  let maxValues = getMaxValues(performances);
  console.log("columnNames :", columnNames);
  console.log("page_idx :", page_idx);
  if (page_idx == "lines"){
    let columnDefs = [
      {
        headerName: 'Name',
        field: 'Model',
        pinned: "left"
      },
      {
        headerName: 'Avg',
        field: 'Avg',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75
      },
      {
        headerName: 'Rank',
        field: 'Rank',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75
      },
      {
        headerName: 'Size',
        field: 'Size',
        columnGroupShow: 'closed',  // 列组分组
        minWidth: 75
      },
      {
        headerName: 'User Interface&Experience',
        columnGroupShow: 'closed',   // 列组分组
        field: 'User Interface&Experience',
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["User Interface&Experience"]) {
            return { color: 'red' };
          }
          return null;
        },
      },
      {
        headerName: 'Development&Programming',
        columnGroupShow: 'closed',   // 列组分组
        field: 'Development&Programming',
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Development&Programming"]) {
            return { color: 'red' };
          }
          return null;
        },
      },
      {
        headerName: 'Specialized Computing',
        field: 'Specialized Computing',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Specialized Computing"]) {
            return { color: 'red' };
          }
          return null;
        },
        
      },
      {
        headerName: 'Tools, Environments, and Practices',
        field: 'Tools, Environments, and Practices',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Tools, Environments, and Practices"]) {
            return { color: 'red' };
          }
          return null;
        },
        
      },
      {
        headerName: 'Emerging Technologies&Applications',
        field: 'Emerging Technologies&Applications',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Emerging Technologies&Applications"]) {
            return { color: 'red' };
          }
          return null;
        },
        
      },
      {
        headerName: 'Miscellaneous and General Inquiry',
        field: 'Miscellaneous and General Inquiry',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Miscellaneous and General Inquiry"]) {
            return { color: 'red' };
          }
          return null;
        },
        
      },
      {
        headerName: 'Databases&Data Handling',
        field: 'Databases&Data Handling',
        columnGroupShow: 'closed',   // 列组分组
        minWidth: 75,
        cellStyle: (params: ICellRendererParams) => {
          if (params.value === maxValues["Databases&Data Handling"]) {
            return { color: 'red' };
          }
          return null;
        },
        
      }
    ]
    return columnDefs;
  }
  else{
  let columnDefs = [
    {
      headerName: 'Model',
      children: [
        {
          headerName: 'Open',
          field: 'group1',
          rowGroup: true,  // 行组分组
          hide: true,  // 行组分组需要隐藏列
        },
        {
          headerName: 'Parameters',
          field: 'group2',
          rowGroup: true,  // 行组分组
          hide: true,  // 行组分组需要隐藏列
        },
        {
          headerName: 'Name',
          field: 'Model',
          pinned: "left"
        }
      ]
    },
    {
      headerName: 'Score',
      children: [
        {
          headerName: 'Avg',
          field: 'Avg',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75
        },
        {
          headerName: 'Rank',
          field: 'Rank',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75
        },
        {
          headerName: 'Size',
          field: 'Size',
          columnGroupShow: 'closed',  // 列组分组
          minWidth: 75
        },
        {
          headerName: 'User Interface&Experience',
          columnGroupShow: 'closed',   // 列组分组
          field: 'User Interface&Experience',
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["User Interface&Experience"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Development&Programming',
          columnGroupShow: 'closed',   // 列组分组
          field: 'Development&Programming',
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Development&Programming"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Specialized Computing',
          field: 'Specialized Computing',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Specialized Computing"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Tools, Environments, and Practices',
          field: 'Tools, Environments, and Practices',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Tools, Environments, and Practices"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Emerging Technologies&Applications',
          field: 'Emerging Technologies&Applications',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Emerging Technologies&Applications"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Miscellaneous and General Inquiry',
          field: 'Miscellaneous and General Inquiry',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Miscellaneous and General Inquiry"]) {
              return { color: 'red' };
            }
            return null;
          },
          
        },
        {
          headerName: 'Databases&Data Handling',
          field: 'Databases&Data Handling',
          columnGroupShow: 'closed',   // 列组分组
          minWidth: 75,
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Databases&Data Handling"]) {
              return { color: 'red' };
            }
            return null;
          },
        }
      ]
    }
  ];
  return columnDefs;
  }
  // return columnNames
  //   .map((column_name) => {
  //       if (column_name === "group1" || column_name === "group2") {

  //         return {
  //           field: column_name,
  //           rowGroup: true, // 启用分组
  //           hide: true, // 隐藏列本身，仅显示分组
  //         };
  //       }
  //       if (column_name == "Model"){
  //         return {
  //           field: column_name,
  //           suppressMovable: true,
  //           cellClass: 'suppress-movable-col',
  //           flex: 2,
  //           pinned : "left",
  //           tooltipField: "Estimated Cutoff For LiveCodeBench",
  //         }
  //       }
  //       else if (column_name == "Rank"){
  //         return {
  //           field: column_name,
  //           suppressMovable: true,
  //           cellClass: 'suppress-movable-col',
  //         }
  //       }
  //       else if (column_name == "Estimated Cutoff For LiveCodeBench"){
  //         return null
  //       }
  //       else if (column_name == "Contaminated"){
  //         return null
  //       }
  //       else {
  //         let mwidth = 75
  //         if (column_name.length > 4){
  //           mwidth = 95
  //         }else if (column_name.length <3){
  //           mwidth = 70
  //         }
  //         if (column_name == "Scheme" || column_name == "VimL" || column_name == "Ruby"){
  //           mwidth = 105
  //         }
  //         return {
  //           field: column_name,
  //           minWidth: mwidth,
  //         }
  //       }
  //     }
  //   )
  //   .filter((columnDef) => columnDef !== null)
}

export { getDateMarksFromTimestamps, getLeaderboard, getColumnDefs }
