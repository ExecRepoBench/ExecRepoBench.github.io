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
  index: number,
  start: number,
  end: number
) {
  const results = results_df.filter(
    (result) =>
      result["index"] === index
  )
  const dictionary: { [key: string]: any } = {};

  if (results.length > 0 && results[0] !== null) {
    Object.keys(results[0]).forEach(key => {
      // 直接将字符串赋值给 dictionary[key]
      dictionary[key] = results[0][key];
    });
  } else {
    console.log(`${index}: 不存在`);
  }

  return {
    dictionary
  }
}

function getLeaderboard(
  performances: Array<any>,
  models: Array<any>,
  indexs: Array<any>,
  start: number,
  end: number
) {

  return indexs
    .map((index) => {
      const { dictionary } = get_pass_at_1(
        performances,
        index,
        0,
        0
      )
      let output: { [key: string]: any } = {}
      
      // 根据 index 找到对应的 model
      const model = performances.find(model => model.index === index);
      
      if (model) {
        output["Model"] = model.model;
      } else {
        output["Model"] = "Unknown"; // 如果没有找到对应的 model，可以设置一个默认值
      }
      
      output["Contaminated"] = false 
      Object.keys(dictionary).forEach(key => {
        if (key != "model" && key != "date" && key != "index") {
          output[key] = dictionary[key];
        }
      });
      return output
    })
    .sort((a, b) => {
      const aWinRate = parseFloat(a["Avg_ES"]);
      const bWinRate = parseFloat(b["Avg_ES"]);
      const aDrawRate = parseFloat(a["Avg_Pass@1"]);
      const bDrawRate = parseFloat(b["Avg_Pass@1"]);

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
        const currentWinRate = parseFloat(model["Avg_ES"]);
        const currentDrawRate = parseFloat(model["Avg_Pass@1"]);

        if (acc.results.length > 0) {
          const lastWinRate = parseFloat(acc.results[acc.results.length - 1]["Avg_ES"]);
          const lastDrawRate = parseFloat(acc.results[acc.results.length - 1]["Avg_Pass@1"]);

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

function getDateMarksFromTimestamps(timestamps: Array<number>) {
  return timestamps.map((timestamp) => ({
    value: timestamp,
    label: new Date(timestamp).toLocaleDateString(undefined, {
      timeZone: "UTC",
    }),
  }))
}

function getMaxValues(performances: Array<any>) {
  // 需要比较的键
  const keysToCompare = [
    "Random_Span_ES",
    "Random_Span_Pass@1",
    "Random_Singleline_ES",
    "Random_Singleline_Pass@1",
    "Random_Multiline_ES",
    "Random_Multiline_Pass@1",
    "Grammar_Expression_ES",
    "Grammar_Expression_Pass@1",
    "Grammar_Statement_ES",
    "Grammar_Statement_Pass@1",
    "Grammar_Function_ES",
    "Grammar_Function_Pass@1",
    "Avg_ES",
    "Avg_Pass@1"
  ];

  // 初始化最大值字典
  const maxValues: { [key: string]: string } = {};

  // 遍历 performances 数组
  performances.forEach(performance => {
    keysToCompare.forEach(key => {
      const value = performance[key];
      // 如果当前键还没有最大值，或者当前值的胜率更大，或者胜率相同但不输不赢的概率更大，则更新最大值
      if (!maxValues[key] || parseFloat(value) > parseFloat(maxValues[key]) ) {
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
  console.log("performances :", performances);
  console.log("page_idx :", page_idx);
  if (page_idx == "lines"){
    let columnDefs = [
      {
        headerName: "Models",
        field: "Model"
      },
      {
        headerName: "Params",
        field: "Size"
      },
      {
        headerName: 'Rank',
        field: 'Rank',
        minWidth: 75
      },
      {
        headerName: "Avg", // 顶层列组
        children: [
          { headerName: "ES", field: "Avg_ES",
            cellStyle: (params: ICellRendererParams) => {
              if (params.value === maxValues["Avg_ES"]) {
                return { color: 'red' };
              }
              return null;
            }
          }, // 子列
          { headerName: "Pass@1", field: "Avg_Pass@1",
            cellStyle: (params: ICellRendererParams) => {
              if (params.value === maxValues["Avg_Pass@1"]) {
                return { color: 'red' };
              }
              return null;
            }
          }, // 子列
        ] 
      },
      {
        headerName: "Random Completion", // 顶层列组
        children: [
          {
            headerName: "Span", // 子列组Single-line Multi-line Expression Statement Function
            children: [
              { headerName: "ES", field: "Random_Span_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Span_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Random_Span_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Span_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
          {
            headerName: "Single-line", // 子列组
            children: [
              { headerName: "ES", field: "Random_Singleline_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Singleline_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Random_Singleline_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Singleline_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
          {
            headerName: "Multi-line", // 子列组
            children: [
              { headerName: "ES", field: "Random_Multiline_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Multiline_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Random_Multiline_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Random_Multiline_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
        ],
      },
      {
        headerName: "Grammar-based Completion", // 顶层列组
        children: [
          {
            headerName: "Expression", // 子列组
            children: [
              { headerName: "ES", field: "Grammar_Expression_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Expression_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Grammar_Expression_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Expression_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
          {
            headerName: "Statement", // 子列组
            children: [
              { headerName: "ES", field: "Grammar_Statement_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Statement_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Grammar_Statement_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Statement_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
          {
            headerName: "Function", // 子列组
            children: [
              { headerName: "ES", field: "Grammar_Function_ES",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Function_ES"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
              { headerName: "Pass@1", field: "Grammar_Function_Pass@1",
                cellStyle: (params: ICellRendererParams) => {
                  if (params.value === maxValues["Grammar_Function_Pass@1"]) {
                    return { color: 'red' };
                  }
                  return null;
                }
              }, // 子列
            ],
          },
        ],
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
          field: 'Group1',
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
      headerName: "Params",
      field: "Size"
    },
    {
      headerName: 'Rank',
      field: 'Rank',
      minWidth: 75
    },
    {
      headerName: "Avg", // 顶层列组
      children: [
        { headerName: "ES", field: "Avg_ES",
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Avg_ES"]) {
              return { color: 'red' };
            }
            return null;
          }
        }, // 子列
        { headerName: "Pass@1", field: "Avg_Pass@1",
          cellStyle: (params: ICellRendererParams) => {
            if (params.value === maxValues["Avg_Pass@1"]) {
              return { color: 'red' };
            }
            return null;
          }
        }, // 子列
      ] 
    },
    {
      headerName: "Random Completion", // 顶层列组 columnGroupShow: 'closed',   // 列组分组
      children: [
        {
          headerName: "Span", // 子列组Single-line Multi-line Expression Statement Function
          children: [
            { headerName: "ES", field: "Random_Span_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Span_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Random_Span_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Span_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
        {
          headerName: "Single-line", // 子列组
          children: [
            { headerName: "ES", field: "Random_Singleline_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Singleline_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Random_Singleline_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Singleline_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
        {
          headerName: "Multi-line", // 子列组
          children: [
            { headerName: "ES", field: "Random_Multiline_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Multiline_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Random_Multiline_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Random_Multiline_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
      ],
    },
    {
      headerName: "Grammar-based Completion", // 顶层列组
      children: [
        {
          headerName: "Expression", // 子列组
          children: [
            { headerName: "ES", field: "Grammar_Expression_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Expression_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Grammar_Expression_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Expression_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
        {
          headerName: "Statement", // 子列组
          children: [
            { headerName: "ES", field: "Grammar_Statement_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Statement_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Grammar_Statement_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Statement_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
        {
          headerName: "Function", // 子列组
          children: [
            { headerName: "ES", field: "Grammar_Function_ES",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Function_ES"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
            { headerName: "Pass@1", field: "Grammar_Function_Pass@1",
              cellStyle: (params: ICellRendererParams) => {
                if (params.value === maxValues["Grammar_Function_Pass@1"]) {
                  return { color: 'red' };
                }
                return null;
              }
            }, // 子列
          ],
        },
      ],
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
